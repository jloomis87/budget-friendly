import { Badge, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useState } from 'react';
import { useSavings } from '../contexts/SavingsContext';

interface SavingsUpdateBadgeProps {
  onUpdateClick: () => void;
  onMenuItemClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export function SavingsUpdateBadge({ onUpdateClick, onMenuItemClick }: SavingsUpdateBadgeProps) {
  const { savingsNeedsUpdate, lastUpdated } = useSavings();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUpdateClick = () => {
    handleClose();
    onUpdateClick();
  };

  const handleMenuItemClick = (event: React.MouseEvent<HTMLElement>) => {
    handleClose();
    onMenuItemClick?.(event);
  };

  const lastUpdateText = lastUpdated 
    ? `Last savings update: ${new Date(lastUpdated).toLocaleDateString()}`
    : 'Savings never updated';

  return (
    <>
      <Tooltip title={lastUpdateText}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
        >
          <Badge
            color="error"
            variant="dot"
            invisible={!savingsNeedsUpdate}
          >
            <AccountCircle />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {savingsNeedsUpdate && (
          <MenuItem onClick={handleUpdateClick} sx={{ color: 'error.main' }}>
            Update Current Savings
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuItemClick}>My Profile</MenuItem>
        {/* Add other menu items as needed */}
      </Menu>
    </>
  );
} 