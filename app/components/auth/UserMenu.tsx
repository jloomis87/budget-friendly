import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  Switch,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Import specific icons from materialIcons utility
import { PersonIcon, LogoutIcon, AccountCircleIcon, DarkModeIcon, LightModeIcon } from '../../utils/materialIcons';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Handle menu open
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle logout
  const handleLogout = () => {
    handleClose();
    logout();
  };

  // Handle theme toggle
  const handleThemeToggle = (event: React.MouseEvent) => {
    // Stop propagation to prevent menu from closing
    event.stopPropagation();
    toggleColorMode();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return '?';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
  };

  // Get user first name
  const getFirstName = () => {
    if (!user || !user.name) return 'User';
    return user.name.split(' ')[0];
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Button
        onClick={handleClick}
        color="inherit"
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
        startIcon={
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.light',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {getUserInitials()}
          </Avatar>
        }
      >
        <Typography sx={{ ml: 1, fontWeight: 500 }}>
          {getFirstName()}
        </Typography>
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        id="user-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 200,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {user?.email}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          My Profile
        </MenuItem>
        
        <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Account Settings
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={(e) => e.stopPropagation()} sx={{ py: 1.5 }}>
          <ListItemIcon>
            {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </ListItemIcon>
          Dark Mode
          <Box sx={{ ml: 'auto' }}>
            <Switch
              checked={mode === 'dark'}
              onChange={(e) => {
                e.stopPropagation();
                toggleColorMode();
              }}
              size="small"
            />
          </Box>
        </MenuItem>
        
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
} 