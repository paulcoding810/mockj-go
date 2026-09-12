import { useState } from "react";
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
import { ContentPaste, FormatAlignLeft } from "@mui/icons-material";
import MockJGoClient from "../services/api.js";
import { JsonHelper, ClipboardHelper, StorageHelper } from "../utils/helpers.js";

const CONTENT_TYPES = [
  { value: "application/json", label: "JSON", placeholder: '{"example": "data", "status": "success"}' },
  { value: "application/xml", label: "XML", placeholder: "<root><example>data</example></root>" },
  { value: "text/plain", label: "Plain text", placeholder: "Hello, world" },
  { value: "text/csv", label: "CSV", placeholder: "name,age\nJohn,30" },
  { value: "text/markdown", label: "Markdown", placeholder: "# Title\n\nSome **markdown**." },
  { value: "application/yaml", label: "YAML", placeholder: "example: data\nstatus: success" },
];

export default function Home({ addToast }) {
  const [jsonContent, setJsonContent] = useState("");
  const [contentType, setContentType] = useState("application/json");
  const [expiresIn, setExpiresIn] = useState("720");
  const [endpoint, setEndpoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: false, error: null });

  const client = new MockJGoClient();

  const isJson = contentType === "application/json";
  const contentReady =
    jsonContent.trim() !== "" && (!isJson || validation.valid);
  const activeType =
    CONTENT_TYPES.find((t) => t.value === contentType) || CONTENT_TYPES[0];

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
      );
      // /raw/{id} is served with the stored content type by the backend.
      const endpointUrl = `${window.location.origin}/raw/${response.data.id}`;

      const endpointData = {
        ...response.data,
        endpointUrl,
      };

      setEndpoint(endpointData);

      // Save to local storage for recent endpoints
      StorageHelper.saveRecentEndpoint(endpointData);

      addToast("JSON endpoint created successfully!", "success");

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
                  multiline
                  rows={8}
                  label="Content"
                  placeholder={activeType.placeholder}
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

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Expires In</InputLabel>
                  <Select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    label="Expires In"
                  >
                    <MenuItem value="1">1 hour</MenuItem>
                    <MenuItem value="24">1 day</MenuItem>
                    <MenuItem value="168">1 week</MenuItem>
                    <MenuItem value="720">30 days</MenuItem>
                    <MenuItem value="1440">60 days</MenuItem>
                    <MenuItem value="4320">180 days</MenuItem>
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
                    <Typography variant="body2">
                      <strong>ID:</strong> {endpoint.id}
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
                >
                  Open Content
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
