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
  CircularProgress,
  Badge,
  Tooltip,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSavings } from '../../contexts/SavingsContext';
import { useNavigate } from 'react-router-dom';

// Import specific icons from materialIcons utility
import { 
  LogoutIcon, 
  AccountCircleIcon, 
  DarkModeIcon, 
  LightModeIcon,
  NotificationsIcon,
  SecurityIcon,
  HelpIcon
} from '../../utils/materialIcons';

interface UserMenuProps {
}

const UserMenu: React.FC<UserMenuProps> = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleColorMode, isLoading } = useTheme();
  const { lastUpdated } = useSavings();
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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return '?';
    
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Button
        onClick={handleClick}
        sx={{
          textTransform: 'none',
          color: 'inherit',
          p: 0.5,
          minWidth: 'auto',
          borderRadius: 2,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'white',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '2px solid',
            borderColor: 'background.paper',
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s ease'
            }
          }}
        >
          {getUserInitials()}
        </Avatar>
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
            width: 280,
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
        
        <MenuItem onClick={() => {
          handleClose();
          navigate('/settings');
        }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Account Settings
        </MenuItem>

        <MenuItem onClick={() => {
          handleClose();
          navigate('/privacy-security');
        }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <SecurityIcon fontSize="small" />
          </ListItemIcon>
          Privacy & Security
        </MenuItem>

        <MenuItem onClick={() => {
          handleClose();
          navigate('/help-support');
        }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          Help & Support
        </MenuItem>
        
        <Divider />
        
        <MenuItem sx={{ py: 1.5 }}>
          <ListItemIcon>
            {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </ListItemIcon>
          Dark Mode
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            {isLoading ? (
              <CircularProgress size={20} thickness={4} sx={{ mr: 1 }} />
            ) : (
              <Switch
                checked={mode === 'dark'}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleColorMode();
                }}
                size="small"
                disabled={isLoading}
              />
            )}
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

export default UserMenu; 