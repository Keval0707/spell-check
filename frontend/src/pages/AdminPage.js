import React, { useEffect, useState } from "react";
import { List, ListItem, ListItemText, Box, Typography } from "@mui/material";
import axios from "axios";

const AdminPage = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));

    axios
      .get("http://localhost:5000/admin/documents", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDocuments(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <Box>
      <Typography variant="h6">Admin Dashboard</Typography>
      <Typography variant="h6">Users</Typography>
      <List>
        {users.map((user) => (
          <ListItem key={user._id}>
            <ListItemText primary={user.email} />
          </ListItem>
        ))}
      </List>
      <Typography variant="h6">Documents</Typography>
      <List>
        {documents.map((doc) => (
          <ListItem key={doc._id}>
            <ListItemText primary={doc.filename} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default AdminPage;