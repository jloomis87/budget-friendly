import React, { ReactNode } from 'react';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  useTheme as useMuiTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Container
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Menu as MenuIcon,
  DashboardOutlined as DashboardIcon,
  AccountBalanceWalletOutlined as WalletIcon,
  SettingsOutlined as SettingsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  LogoutOutlined as LogoutIcon
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const muiTheme = useMuiTheme();
  const { toggleColorMode } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  
  const isDark = muiTheme.palette.mode === 'dark';

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Transactions', icon: <WalletIcon />, path: '/transactions' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];
  
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Budget Friendly
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            key={item.text} 
            component={Link} 
            to={item.path}
            selected={location.pathname === item.path}
            sx={{ 
              color: location.pathname === item.path 
                ? 'primary.main' 
                : 'text.primary',
              '&.Mui-selected': {
                bgcolor: isDark 
                  ? 'rgba(144, 202, 249, 0.16)' 
                  : 'rgba(25, 118, 210, 0.08)',
              },
              '&:hover': {
                bgcolor: isDark 
                  ? 'rgba(144, 202, 249, 0.08)' 
                  : 'rgba(25, 118, 210, 0.04)',
              }
            }}
          >
            <ListItemIcon sx={{ 
              color: location.pathname === item.path 
                ? 'primary.main' 
                : 'text.primary' 
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        
        {isAuthenticated && (
          <ListItem 
            button 
            onClick={handleLogout}
            sx={{ 
              color: 'text.primary',
              '&:hover': {
                bgcolor: isDark 
                  ? 'rgba(244, 67, 54, 0.08)' 
                  : 'rgba(244, 67, 54, 0.04)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'text.primary' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h6" 
            component={Link} 
            to="/"
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 700 
            }}
          >
            Budget Friendly
          </Typography>
          
          <IconButton 
            onClick={toggleColorMode} 
            color="inherit" 
            aria-label="toggle dark mode"
          >
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          
          {!isAuthenticated ? (
            <Button 
              component={Link} 
              to="/login"
              variant="contained" 
              color="primary"
              sx={{ ml: 1 }}
            >
              Login
            </Button>
          ) : (
            <Button 
              onClick={handleLogout}
              color="inherit"
              sx={{ ml: 1 }}
            >
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      
      <Box component="footer" sx={{ 
        py: 3, 
        px: 2, 
        mt: 'auto', 
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.05)'
      }}>
        <Container maxWidth="lg">
          <Typography variant="body2" align="center" color="text.secondary">
            © {new Date().getFullYear()} Budget Friendly. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
} 