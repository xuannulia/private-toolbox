import React, { ReactNode, useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import HomeRepairServiceOutlinedIcon from '@mui/icons-material/HomeRepairServiceOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ContrastOutlinedIcon from '@mui/icons-material/ContrastOutlined';
import { Link, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Select,
  MenuItem,
  FormControl,
  Typography
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Mode } from 'components/App';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  mode: Mode;
  onChangeMode: () => void;
}
const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' }
];

const Navbar: React.FC<NavbarProps> = ({
  mode,
  onChangeMode: onChangeMode
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timestamp, setTimestamp] = useState(() =>
    Math.floor(Date.now() / 1000)
  );
  const currentLanguage =
    languages.find(({ code }) => code === i18n.resolvedLanguage)?.code ??
    languages.find(({ code }) => code === i18n.language?.split('-')[0])?.code ??
    'en';

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const handleLanguageChange = (event: any) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('lang', newLanguage);
  };

  const navItems: { label: string; path: string }[] = [
    // { label: 'Features', path: '/features' }
    // { label: 'About Us', path: '/about-us' }
  ];

  const languageSelector = (
    <FormControl key="language-selector" size="small" sx={{ minWidth: 120 }}>
      <Select
        value={currentLanguage}
        onChange={handleLanguageChange}
        displayEmpty
        sx={{
          color: 'inherit',
          '& .MuiSelect-icon': {
            color: 'inherit'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          }
        }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {lang.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const buttons: ReactNode[] = [
    languageSelector,
    <IconButton
      key={mode}
      onClick={onChangeMode}
      color="inherit"
      aria-label="Change theme"
      size="small"
    >
      {mode === 'dark' ? (
        <DarkModeOutlinedIcon sx={{ fontSize: 30 }} />
      ) : mode === 'light' ? (
        <LightModeOutlinedIcon sx={{ fontSize: 30 }} />
      ) : (
        <ContrastOutlinedIcon sx={{ fontSize: 30 }} />
      )}
    </IconButton>
  ];
  const drawerList = (
    <List>
      {navItems.map((navItem) => (
        <ListItemButton
          key={navItem.path}
          onClick={() => navigate(navItem.path)}
        >
          <ListItemText primary={navItem.label} />
        </ListItemButton>
      ))}
      {buttons.map((button, index) => (
        <ListItem key={index}>{button}</ListItem>
      ))}
    </List>
  );

  return (
    <AppBar
      position="static"
      sx={{
        background: 'transparent',
        boxShadow: 'none',
        color: 'text.primary',
        pt: 2
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mx: { md: '50px', lg: '150px' }
        }}
      >
        <Link
          to="/"
          aria-label="Current timestamp home"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <Stack direction={'row'} alignItems={'center'} spacing={1}>
            <HomeRepairServiceOutlinedIcon
              sx={{
                color: 'primary.main',
                fontSize: isMobile ? 28 : 32
              }}
            />
            <Typography
              component={'span'}
              fontWeight={800}
              fontSize={{ xs: 18, md: 24 }}
              lineHeight={1}
              fontFamily={'monospace'}
            >
              {timestamp}
            </Typography>
          </Stack>
        </Link>
        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              onClick={toggleDrawer(true)}
              sx={{
                '&:hover': {
                  backgroundColor: theme.palette.primary.main
                }
              }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="right"
              open={drawerOpen}
              onClose={toggleDrawer(false)}
            >
              {drawerList}
            </Drawer>
          </>
        ) : (
          <Stack direction={'row'} spacing={3} alignItems={'center'}>
            {navItems.map((item) => (
              <Button
                key={item.label}
                color="inherit"
                sx={{
                  '&:hover': {
                    color: theme.palette.primary.main,
                    transition: 'color 0.3s ease',
                    backgroundColor: 'white'
                  }
                }}
              >
                <Link
                  to={item.path}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {item.label}
                </Link>
              </Button>
            ))}
            {buttons}
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
