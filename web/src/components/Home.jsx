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

export default function Home({ addToast }) {
  const [jsonContent, setJsonContent] = useState("");
  const [expiresIn, setExpiresIn] = useState("720");
  const [endpoint, setEndpoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: false, error: null });

  const client = new MockJGoClient();

  const validateJson = (value) => {
    const result = JsonHelper.validate(value);
    setValidation(result);
    return result.valid;
  };

  const handleJsonChange = (value) => {
    setJsonContent(value);
    if (value.trim()) {
      validateJson(value);
    } else {
      setValidation({ valid: false, error: null });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!jsonContent.trim()) {
      addToast("JSON content is required", "error");
      return;
    }

    if (!validateJson(jsonContent)) {
      addToast("Please enter valid JSON", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await client.createJson(jsonContent, expiresIn);
      // /raw/{id} is served as raw application/json by the backend.
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
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="JSON Content"
                  placeholder='{"example": "data", "status": "success"}'
                  value={jsonContent}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  error={!validation.valid && validation.error !== null}
                  helperText={validation.error || "Enter valid JSON data"}
                  className="json-editor"
                  sx={{ mb: 2 }}
                />

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
                  disabled={loading || !jsonContent.trim() || !validation.valid}
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
                  Open JSON
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
