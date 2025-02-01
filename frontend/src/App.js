import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  TextField,
  Container,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import { CloudUpload, History, Dashboard, Share } from "@mui/icons-material";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [view, setView] = useState("upload");
  const [language, setLanguage] = useState("en-US");
  const [collaboratorEmail, setCollaboratorEmail] = useState("");

  // Fetch document history and shared documents
  useEffect(() => {
    if (token) {
      axios
        .get("http://localhost:5000/documents", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setDocuments(res.data))
        .catch((err) => console.error(err));

      axios
        .get("http://localhost:5000/shared-documents", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setSharedDocuments(res.data))
        .catch((err) => console.error(err));
    }
  }, [token]);

  // Handle file upload
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data);
      setEditorContent(res.data.correctedText);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle document download
  const handleDownload = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "corrected_document.txt");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle adding collaborator
  const handleAddCollaborator = async (documentId) => {
    try {
      await axios.post(
        `http://localhost:5000/document/${documentId}/add-collaborator`,
        { email: collaboratorEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Collaborator added.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Grammar Checker
          </Typography>
          {token && (
            <Box>
              <Button color="inherit" onClick={() => setView("upload")} startIcon={<CloudUpload />}>
                Upload
              </Button>
              <Button color="inherit" onClick={() => setView("history")} startIcon={<History />}>
                History
              </Button>
              <Button color="inherit" onClick={() => setView("shared")} startIcon={<Share />}>
                Shared
              </Button>
              <Button color="inherit" onClick={() => setView("admin")} startIcon={<Dashboard />}>
                Admin
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {!token ? (
          <Box>
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={() => axios.post("http://localhost:5000/signup", { email, password }).then(() => alert("User registered."))}
            >
              Signup
            </Button>
            <Button
              variant="contained"
              sx={{ ml: 2 }}
              onClick={() => axios.post("http://localhost:5000/login", { email, password }).then((res) => setToken(res.data.token))}
            >
              Login
            </Button>
          </Box>
        ) : (
          <Box>
            {view === "upload" && (
              <Box>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                <Select value={language} onChange={(e) => setLanguage(e.target.value)} sx={{ ml: 2 }}>
                  <MenuItem value="en-US">English (US)</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                </Select>
                <Button variant="contained" onClick={handleUpload} sx={{ ml: 2 }}>
                  Upload
                </Button>
                {result && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6">Corrected Text</Typography>
                    <ReactQuill value={editorContent} onChange={setEditorContent} />
                    <Typography variant="h6" sx={{ mt: 2 }}>Stats</Typography>
                    <pre>{JSON.stringify(result.stats, null, 2)}</pre>
                  </Box>
                )}
              </Box>
            )}

            {view === "history" && (
              <Box>
                <Typography variant="h6">Document History</Typography>
                <List>
                  {documents.map((doc) => (
                    <ListItem key={doc._id}>
                      <ListItemText primary={doc.filename} />
                      <Button variant="contained" onClick={() => handleDownload(doc._id)}>
                        Download
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {view === "shared" && (
              <Box>
                <Typography variant="h6">Shared Documents</Typography>
                <List>
                  {sharedDocuments.map((doc) => (
                    <ListItem key={doc._id}>
                      <ListItemText primary={doc.filename} />
                      <Button variant="contained" onClick={() => handleDownload(doc._id)}>
                        Download
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </div>
  );
}

export default App;