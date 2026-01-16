import { useState, useEffect } from "react";
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
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  ContentPaste,
  FormatAlignLeft,
  Edit,
  Delete,
  Close,
  Visibility,
} from "@mui/icons-material";
import MockJGoClient from "../services/api.js";
import {
  JsonHelper,
  DateHelper,
  ClipboardHelper,
  StorageHelper,
} from "../utils/helpers.js";

export default function Home({ addToast, initialId = "", viewMode = false }) {
  const [jsonContent, setJsonContent] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState("720");
  const [endpoint, setEndpoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: false, error: null });

  // View mode states
  const [viewId, setViewId] = useState(initialId);
  const [endpointData, setEndpointData] = useState(null);
  const [endpointLoading, setEndpointLoading] = useState(false);
  const [endpointError, setEndpointError] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Update form states
  const [updateJson, setUpdateJson] = useState("");
  const [updatePassword, setUpdatePassword] = useState("");
  const [updateExpiresIn, setUpdateExpiresIn] = useState("720");
  const [updateValidation, setUpdateValidation] = useState({
    valid: false,
    error: null,
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Delete form states
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const client = new MockJGoClient();

  const validateJson = (value) => {
    const result = JsonHelper.validate(value);
    setValidation(result);
    return result.valid;
  };

  const validateUpdateJson = (value) => {
    const result = JsonHelper.validate(value);
    setUpdateValidation(result);
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

  const handleUpdateJsonChange = (value) => {
    setUpdateJson(value);
    if (value.trim()) {
      validateUpdateJson(value);
    } else {
      setUpdateValidation({ valid: false, error: null });
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
        expiresIn,
      );
      const endpointUrl = `${window.location.origin}/api/json/${response.data.id}`;
      const viewUrl = `${window.location.origin}/${response.data.id}`;

      const endpointData = {
        ...response.data,
        endpointUrl,
        viewUrl,
      };

      setEndpoint(endpointData);

      // Save to local storage for recent endpoints
      StorageHelper.saveRecentEndpoint(endpointData);

      addToast("JSON endpoint created successfully!", "success");
    } catch (error) {
      addToast(error.message || "Failed to create endpoint", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadEndpoint = async (id) => {
    if (!id || id.trim() === "") {
      setEndpointData(null);
      setEndpointError(null);
      return;
    }

    setEndpointLoading(true);
    setEndpointError(null);

    try {
      const response = await client.getJson(id.trim());
      setEndpointData(response.data);
      setUpdateJson(response.data.json);
      setUpdateValidation({ valid: true, error: null });

      // Update URL without page reload
      window.history.pushState({}, "", `/${id}`);
    } catch (error) {
      setEndpointError(error.message || "Failed to load endpoint");
      addToast(error.message || "Failed to load endpoint", "error");
    } finally {
      setEndpointLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!updateJson.trim() || !updateValidation.valid) {
      addToast("Please enter valid JSON", "error");
      return;
    }

    if (!updatePassword) {
      addToast("Password is required for updates", "error");
      return;
    }

    if (!endpointData) return;

    setUpdateLoading(true);

    try {
      await client.updateJson(
        endpointData.id,
        updateJson,
        updatePassword,
        updateExpiresIn,
      );
      await loadEndpoint(endpointData.id); // Reload endpoint data
      setShowUpdate(false);
      setUpdatePassword("");
      addToast("Endpoint updated successfully!", "success");
    } catch (error) {
      addToast(error.message || "Failed to update endpoint", "error");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    if (!deletePassword) {
      addToast("Password is required for deletion", "error");
      return;
    }

    if (!endpointData) return;

    setDeleteLoading(true);

    try {
      await client.deleteJson(endpointData.id, deletePassword);
      addToast("Endpoint deleted successfully!", "success");

      // Reset form after successful deletion
      setEndpointData(null);
      setViewId("");
      setDeletePassword("");
      setShowDelete(false);
      window.history.pushState({}, "", "/");
    } catch (error) {
      addToast(error.message || "Failed to delete endpoint", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatJson = () => {
    const formatted = JsonHelper.format(jsonContent);
    setJsonContent(formatted);
    validateJson(formatted);
  };

  const formatUpdateJson = () => {
    const formatted = JsonHelper.format(updateJson);
    setUpdateJson(formatted);
    validateUpdateJson(formatted);
  };

  const copyToClipboard = async (text, label) => {
    try {
      await ClipboardHelper.copy(text);
      addToast(`${label} copied to clipboard!`, "success");
    } catch (error) {
      addToast("Failed to copy to clipboard", "error");
    }
  };

  const viewRawJson = () => {
    if (endpointData) {
      window.open(
        `${window.location.origin}/api/json/${endpointData.id}/content`,
        "_blank",
      );
    }
  };

  const resetForm = () => {
    setJsonContent("");
    setPassword("");
    setExpiresIn("720");
    setEndpoint(null);
    setValidation({ valid: false, error: null });
  };

  // Load initial endpoint if in view mode
  useEffect(() => {
    if (viewMode && initialId) {
      setViewId(initialId);
      loadEndpoint(initialId);
    }
  }, [viewMode, initialId]);

  if (viewMode) {
    return (
      <Container maxWidth="lg">
        {/* View Mode Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Load JSON Endpoint
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              <TextField
                fullWidth
                label="Endpoint ID"
                value={viewId}
                onChange={(e) => setViewId(e.target.value)}
                placeholder="Enter endpoint ID"
                sx={{ maxWidth: 400 }}
              />
              <Button
                variant="contained"
                onClick={() => loadEndpoint(viewId)}
                disabled={endpointLoading || !viewId.trim()}
              >
                {endpointLoading ? "Loading..." : "Load"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Endpoint Loading/Error States */}
        {endpointLoading && (
          <Card sx={{ mb: 3, textAlign: "center", py: 4 }}>
            <CardContent>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6">Loading JSON endpoint...</Typography>
            </CardContent>
          </Card>
        )}

        {endpointError && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Alert severity="error">
                <Typography variant="h6" gutterBottom>
                  ❌ Endpoint Not Found
                </Typography>
                <Typography>{endpointError}</Typography>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Endpoint Content */}
        {endpointData && (
          <>
            <Grid container spacing={3}>
              {/* Endpoint Info */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      Endpoint Information
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        API Endpoint URL
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                        <TextField
                          fullWidth
                          value={`${window.location.origin}/api/json/${endpointData.id}`}
                          InputProps={{ readOnly: true }}
                          size="small"
                        />
                        <IconButton
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/api/json/${endpointData.id}`,
                              "API URL",
                            )
                          }
                        >
                          <ContentPaste />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Endpoint Details
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2">
                          <strong>ID:</strong> {endpointData.id}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Created:</strong>{" "}
                          {DateHelper.formatDateTime(endpointData.createdAt)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Modified:</strong>{" "}
                          {DateHelper.formatDateTime(endpointData.modifiedAt)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Expires:</strong>{" "}
                          {DateHelper.formatDateTime(endpointData.expires)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Status:</strong>
                          <Chip
                            label={DateHelper.formatRelative(
                              endpointData.expires,
                            )}
                            color={
                              DateHelper.formatRelative(
                                endpointData.expires,
                              ) === "Expired"
                                ? "error"
                                : "success"
                            }
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={viewRawJson}
                      >
                        View Raw JSON
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setShowUpdate(true)}
                        disabled={
                          DateHelper.formatRelative(endpointData.expires) ===
                          "Expired"
                        }
                      >
                        Update
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => setShowDelete(true)}
                        disabled={
                          DateHelper.formatRelative(endpointData.expires) ===
                          "Expired"
                        }
                      >
                        Delete
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* JSON Content */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      JSON Content
                    </Typography>

                    <Box className="json-display" sx={{ mb: 2, p: 2 }}>
                      <pre>
                        {JsonHelper.formatForDisplay(endpointData.json)}
                      </pre>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          copyToClipboard(
                            JsonHelper.formatForDisplay(endpointData.json),
                            "JSON",
                          )
                        }
                      >
                        <ContentPaste sx={{ mr: 1 }} />
                        Copy JSON
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Update Form */}
            {showUpdate && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5">Update JSON Endpoint</Typography>
                    <IconButton onClick={() => setShowUpdate(false)}>
                      <Close />
                    </IconButton>
                  </Box>

                  <Box component="form" onSubmit={handleUpdate}>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      label="New JSON Content"
                      value={updateJson}
                      onChange={(e) => handleUpdateJsonChange(e.target.value)}
                      error={
                        !updateValidation.valid &&
                        updateValidation.error !== null
                      }
                      helperText={
                        updateValidation.error || "Enter valid JSON data"
                      }
                      className="json-editor"
                      sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<FormatAlignLeft />}
                        onClick={formatUpdateJson}
                        disabled={!updateJson.trim()}
                      >
                        Format JSON
                      </Button>

                      {updateJson.trim() && updateValidation.valid && (
                        <Chip
                          label="✓ Valid JSON"
                          color="success"
                          size="small"
                        />
                      )}
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="password"
                          label="Current Password"
                          value={updatePassword}
                          onChange={(e) => setUpdatePassword(e.target.value)}
                          helperText="Required to update this endpoint"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Expires In</InputLabel>
                          <Select
                            value={updateExpiresIn}
                            onChange={(e) => setUpdateExpiresIn(e.target.value)}
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
                      </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowUpdate(false)}
                        disabled={updateLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          updateLoading ||
                          !updateJson.trim() ||
                          !updateValidation.valid
                        }
                      >
                        {updateLoading ? "Updating..." : "Update Endpoint"}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Delete Confirmation */}
            {showDelete && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5">Delete JSON Endpoint</Typography>
                    <IconButton onClick={() => setShowDelete(false)}>
                      <Close />
                    </IconButton>
                  </Box>

                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ This action cannot be undone. The endpoint will be
                    permanently deleted.
                  </Alert>

                  <Box component="form" onSubmit={handleDelete}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      helperText="Required to delete this endpoint"
                      sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowDelete(false)}
                        disabled={deleteLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        color="error"
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? "Deleting..." : "Delete Endpoint"}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Container>
    );
  }

  // Create Mode (default)
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
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
                      label="Password"
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
