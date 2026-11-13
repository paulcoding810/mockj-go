import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { ContentCopy, ContentPaste, FormatAlignLeft } from "@mui/icons-material";
import MockJGoClient from "../services/api.js";
import { JsonHelper, ClipboardHelper, StorageHelper } from "../utils/helpers.js";

const CONTENT_TYPES = [
  { value: "application/json", label: "JSON", placeholder: '{"example": "data", "status": "success"}' },
  { value: "application/xml", label: "XML", placeholder: "<root><example>data</example></root>" },
  { value: "text/plain", label: "Plain text", placeholder: "Hello, world" },
  { value: "text/csv", label: "CSV", placeholder: "name,age\nJohn,30" },
  { value: "text/markdown", label: "Markdown", placeholder: "# Title\n\nSome **markdown**." },
  { value: "application/yaml", label: "YAML", placeholder: "example: data\nstatus: success" },
  {
    value: "application/javascript",
    label: "JavaScript",
    placeholder: "console.log('hello');",
  },
];

// Backend aliases that the dropdown shows under their canonical type.
const TYPE_ALIASES = {
  "text/xml": "application/xml",
  "text/javascript": "application/javascript",
};

// 1 year is sent as 364 days so client clock skew can't exceed the server's 1-year cap.
const EXPIRY_OPTIONS = [
  { hours: "1", label: "1 hour" },
  { hours: "24", label: "1 day" },
  { hours: "168", label: "1 week" },
  { hours: "720", label: "30 days" },
  { hours: "1440", label: "60 days" },
  { hours: "4320", label: "180 days" },
  { hours: "8736", label: "1 year" },
];

const STATUS_OPTIONS = [
  200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504,
];

const DELAY_OPTIONS = [
  { ms: 0, label: "None" },
  { ms: 250, label: "250 ms" },
  { ms: 500, label: "500 ms" },
  { ms: 1000, label: "1 s" },
  { ms: 2000, label: "2 s" },
  { ms: 5000, label: "5 s" },
  { ms: 10000, label: "10 s" },
];

const closestExpiry = (createdAt, expires) => {
  const hours = (new Date(expires) - new Date(createdAt)) / 36e5;
  if (!Number.isFinite(hours)) return "720";
  return EXPIRY_OPTIONS.reduce((best, opt) =>
    Math.abs(opt.hours - hours) < Math.abs(best.hours - hours) ? opt : best,
  ).hours;
};

export default function Home({ addToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [jsonContent, setJsonContent] = useState("");
  const [contentType, setContentType] = useState("application/json");
  const [expiresIn, setExpiresIn] = useState("720");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(200);
  const [delay, setDelay] = useState(0);
  const [endpoint, setEndpoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: false, error: null });

  const client = new MockJGoClient();

  const isJson = contentType === "application/json";
  const contentReady =
    jsonContent.trim() !== "" && (!isJson || validation.valid);
  const activeType =
    CONTENT_TYPES.find((t) => t.value === contentType) || CONTENT_TYPES[0];

  const applyTemplate = (src) => {
    const type = TYPE_ALIASES[src.contentType] || src.contentType || "application/json";
    setJsonContent(src.json || "");
    setContentType(type);
    setName(src.name || "");
    setStatus(src.status || 200);
    setDelay(src.delay || 0);
    setExpiresIn(closestExpiry(src.createdAt, src.expires));
    setEndpoint(null);
    if (type === "application/json" && src.json) {
      setValidation(JsonHelper.validate(src.json));
    } else {
      setValidation({ valid: false, error: null });
    }
  };

  // Recents "Duplicate" navigates here with the source endpoint in router state.
  useEffect(() => {
    const from = location.state?.from;
    if (!from) return;
    navigate(".", { replace: true, state: null });
    if (from.json) {
      applyTemplate(from);
      return;
    }
    client
      .getJson(from.id)
      .then((res) => applyTemplate(res.data))
      .catch(() => addToast("Could not load that endpoint (it may have expired)", "error"));
  }, [location.state]);

  const validateJson = (value) => {
    const result = JsonHelper.validate(value);
    setValidation(result);
    return result.valid;
  };

  const handleJsonChange = (value) => {
    setJsonContent(value);
    if (isJson && value.trim()) {
      validateJson(value);
    } else {
      setValidation({ valid: false, error: null });
    }
  };

  const handleContentTypeChange = (value) => {
    setContentType(value);
    if (value === "application/json" && jsonContent.trim()) {
      validateJson(jsonContent);
    } else {
      setValidation({ valid: false, error: null });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!jsonContent.trim()) {
      addToast("Content is required", "error");
      return;
    }

    if (isJson && !validateJson(jsonContent)) {
      addToast("Please enter valid JSON", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await client.createJson(
        jsonContent,
        expiresIn,
        contentType,
        { name: name.trim(), status, delay },
      );
      // /raw/{id} is served with the stored content type by the backend.
      const endpointUrl = `${window.location.origin}/raw/${response.data.id}`;

      const endpointData = {
        ...response.data,
        endpointUrl,
      };

      setEndpoint(endpointData);

      const { dropped } = StorageHelper.saveRecentEndpoint(endpointData);

      addToast("JSON endpoint created successfully!", "success");
      dropped.forEach((old) =>
        addToast(
          `Recents is full: removed "${old.name || old.id}" from the list. It stays live at /raw/${old.id} until it expires.`,
          "warning",
          10000,
        ),
      );

      // Open the raw JSON directly in a new tab
      window.open(endpointUrl, "_blank");
    } catch (error) {
      addToast(error.message || "Failed to create endpoint", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatJson = () => {
    const formatted = JsonHelper.format(jsonContent);
    setJsonContent(formatted);
    validateJson(formatted);
  };

  const copyToClipboard = async (text, label) => {
    try {
      await ClipboardHelper.copy(text);
      addToast(`${label} copied to clipboard!`, "success");
    } catch (error) {
      addToast("Failed to copy to clipboard", "error");
    }
  };

  const resetForm = () => {
    setJsonContent("");
    setContentType("application/json");
    setExpiresIn("720");
    setName("");
    setStatus(200);
    setDelay(0);
    setEndpoint(null);
    setValidation({ valid: false, error: null });
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 3 }}>
      <Grid container spacing={3}>
        {/* Create Form */}
        <Grid item xs={12} md={endpoint ? 6 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Create JSON Endpoint
              </Typography>

              <Box component="form" onSubmit={handleCreate} sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={contentType}
                    onChange={(e) => handleContentTypeChange(e.target.value)}
                    label="Content Type"
                  >
                    {CONTENT_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Name (optional)"
                  placeholder="e.g. empty list, error case"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  inputProps={{ maxLength: 100 }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Content"
                  placeholder={activeType.placeholder}
                  InputLabelProps={{ shrink: true }}
                  value={jsonContent}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  error={isJson && !validation.valid && validation.error !== null}
                  helperText={
                    isJson
                      ? validation.error || "Enter valid JSON data"
                      : `Enter ${activeType.label} content`
                  }
                  className="json-editor"
                  sx={{ mb: 2 }}
                />

                {isJson && (
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FormatAlignLeft />}
                      onClick={formatJson}
                      disabled={!jsonContent.trim()}
                    >
                      Format JSON
                    </Button>

                    {jsonContent.trim() && validation.valid && (
                      <Chip label="✓ Valid JSON" color="success" size="small" />
                    )}
                  </Box>
                )}

                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Response Status</InputLabel>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      label="Response Status"
                    >
                      {STATUS_OPTIONS.map((code) => (
                        <MenuItem key={code} value={code}>
                          {code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Response Delay</InputLabel>
                    <Select
                      value={delay}
                      onChange={(e) => setDelay(e.target.value)}
                      label="Response Delay"
                    >
                      {DELAY_OPTIONS.map((d) => (
                        <MenuItem key={d.ms} value={d.ms}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Expires In</InputLabel>
                  <Select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    label="Expires In"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <MenuItem key={opt.hours} value={opt.hours}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || !contentReady}
                  sx={{ mb: 2 }}
                >
                  {loading ? "Creating..." : "Create Endpoint"}
                </Button>

                {endpoint && (
                  <Button variant="outlined" onClick={resetForm} fullWidth>
                    Create Another
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Result */}
        {endpoint && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Endpoint Created!
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    API Endpoint URL
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      value={endpoint.endpointUrl}
                      InputProps={{ readOnly: true }}
                      size="small"
                    />
                    <Button
                      variant="outlined"
                      onClick={() =>
                        copyToClipboard(endpoint.endpointUrl, "API URL")
                      }
                    >
                      <ContentPaste />
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Endpoint Details
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {endpoint.name && (
                      <Typography variant="body2">
                        <strong>Name:</strong> {endpoint.name}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>ID:</strong> {endpoint.id}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Response:</strong> {endpoint.status || 200}
                      {endpoint.delay ? ` after ${endpoint.delay} ms` : ""}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Content type:</strong>{" "}
                      {endpoint.contentType || "application/json"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created:</strong>{" "}
                      {new Date(endpoint.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Expires:</strong>{" "}
                      {new Date(endpoint.expires).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  href={endpoint.endpointUrl}
                  target="_blank"
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Open Content
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopy />}
                  onClick={() => applyTemplate(endpoint)}
                  fullWidth
                >
                  Duplicate
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
