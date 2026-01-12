"use client";

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
  Alert,
} from "@mui/material";
import { ContentPaste, FormatAlignLeft } from "@mui/icons-material";
import MockJGoClient from "../src/services/api";
import { JsonHelper, ClipboardHelper } from "../utils/helpers";

export default function Home({ addToast }) {
  const [jsonContent, setJsonContent] = useState("");
  const [password, setPassword] = useState("");
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
      const response = await client.createJson(
        jsonContent,
        password,
        expiresIn
      );
      const endpointUrl = `${window.location.origin}/api/json/${response.data.id}`;
      const viewUrl = `${window.location.origin}/${response.data.id}`;

      setEndpoint({
        ...response.data,
        endpointUrl,
        viewUrl,
      });

      addToast("JSON endpoint created successfully!", "success");
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
    setPassword("");
    setExpiresIn("720");
    setEndpoint(null);
    setValidation({ valid: false, error: null });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          📦 MockJ-Go
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Create temporary JSON endpoints instantly
        </Typography>
      </Box>

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

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Password (optional)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      helperText="Required for updates/deletions"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
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
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

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

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    View & Modify URL
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      value={endpoint.viewUrl}
                      InputProps={{ readOnly: true }}
                      size="small"
                    />
                    <Button
                      variant="outlined"
                      onClick={() =>
                        copyToClipboard(endpoint.viewUrl, "View URL")
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
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
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
                  href={endpoint.viewUrl}
                  target="_blank"
                  fullWidth
                >
                  View & Modify Endpoint
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
