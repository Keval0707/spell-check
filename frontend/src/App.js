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
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [view, setView] = useState("upload");
  const [language, setLanguage] = useState("en-US");
  const [collaboratorEmail, setCollaboratorEmail] = useState("");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      fetchDocuments();
      fetchSharedDocuments();
    }
  }, [token]);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(res.data);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const fetchSharedDocuments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/shared-documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSharedDocuments(res.data);
    } catch (err) {
      console.error("Error fetching shared documents:", err);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file.");
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
      console.error("Upload error:", err);
    }
  };

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
      console.error("Download error:", err);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", { email, password });
      setToken(res.data.token);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleSignup = async () => {
    try {
      await axios.post("http://localhost:5000/signup", { email, password });
      alert("User registered successfully.");
    } catch (err) {
      console.error("Signup error:", err);
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
              <Button color="inherit" onClick={() => setToken("")}>Logout</Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {!token ? (
          <Box>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <Button variant="contained" onClick={handleSignup}>Signup</Button>
            <Button variant="contained" sx={{ ml: 2 }} onClick={handleLogin}>Login</Button>
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
                <Button variant="contained" onClick={handleUpload} sx={{ ml: 2 }}>Upload</Button>
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
              <List>{documents.map((doc) => (
                <ListItem key={doc._id}>
                  <ListItemText primary={doc.filename} />
                  <Button variant="contained" onClick={() => handleDownload(doc._id)}>Download</Button>
                </ListItem>
              ))}</List>
            )}
          </Box>
        )}
      </Container>
    </div>
  );
}

export default App;
