import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { CloudUpload, History, Dashboard, Share } from "@mui/icons-material";

const Navbar = ({ token, setView }) => (
  <AppBar position="static">
    <Toolbar>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Grammar Checker
      </Typography>
      {token && (
        <>
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
        </>
      )}
    </Toolbar>
  </AppBar>
);

export default Navbar;