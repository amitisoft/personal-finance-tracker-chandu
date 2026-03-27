import {
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SavingsIcon from "@mui/icons-material/Savings";
import BarChartIcon from "@mui/icons-material/BarChart";
import TuneIcon from "@mui/icons-material/Tune";
import RepeatIcon from "@mui/icons-material/Repeat";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import RuleIcon from "@mui/icons-material/Rule";
import SearchIcon from "@mui/icons-material/Search";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { formatMoney } from "../utils/money";
import { listBudgetAlerts } from "../api/notifications";
import { listAccounts } from "../api/accounts";

const drawerWidth = 268;

type Props = { children: ReactNode };

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

function formatExpiry(expiresAtMs: number | null) {
  if (!expiresAtMs) return "Login expires at --:--";
  const date = new Date(expiresAtMs);
  return `Login expires at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getGreetingName(displayName?: string | null, email?: string | null) {
  if (displayName?.trim()) return displayName.trim();
  if (email?.trim()) return email.split("@")[0];
  return "User";
}

function formatAlertTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AppShell({ children }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clear = useAuthStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);
  const expiresAtMs = useAuthStore((state) => state.expiresAtMs);
  const ruleAlerts = useNotificationStore((state) => state.ruleAlerts);
  const clearRuleAlerts = useNotificationStore((state) => state.clearRuleAlerts);

  useEffect(() => {
    if (location.pathname === "/transactions") {
      setSearchText(searchParams.get("q") ?? "");
    } else {
      setSearchText("");
    }
  }, [location.pathname, searchParams]);

  const mainNav = useMemo<NavItem[]>(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon fontSize="small" /> },
      { to: "/insights", label: "Insights", icon: <LightbulbIcon fontSize="small" /> },
      { to: "/transactions", label: "Transactions", icon: <ReceiptLongIcon fontSize="small" /> },
      { to: "/rules", label: "Rules", icon: <RuleIcon fontSize="small" /> },
      { to: "/budgets", label: "Budgets", icon: <TuneIcon fontSize="small" /> },
      { to: "/goals", label: "Goals", icon: <SavingsIcon fontSize="small" /> },
      { to: "/reports", label: "Reports", icon: <BarChartIcon fontSize="small" /> },
      { to: "/recurring", label: "Recurring", icon: <RepeatIcon fontSize="small" /> },
      { to: "/accounts", label: "Accounts", icon: <AccountBalanceWalletIcon fontSize="small" /> },
    ],
    [],
  );

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);

  const alerts = useQuery({
    queryKey: ["notifications", "budget-alerts"],
    queryFn: () => listBudgetAlerts(),
    refetchInterval: 60_000,
  });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });

  const budgetAlerts = alerts.data ?? [];
  const alertCount = budgetAlerts.length + ruleAlerts.length;
  const displayCountryCode = (accounts.data ?? [])[0]?.countryCode ?? "IN";
  const greetingName = getGreetingName(user?.displayName, user?.email);
  const expiryLabel = formatExpiry(expiresAtMs);

  const runTransactionSearch = () => {
    const next = new URLSearchParams();
    const value = searchText.trim();
    if (value) next.set("q", value);
    navigate({ pathname: "/transactions", search: next.toString() ? `?${next.toString()}` : "" });
  };

  const sidebar = (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        px: 2.25,
        py: 2.5,
        position: "relative",
        bgcolor: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(22px)",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(420px 220px at 0% 0%, rgba(70,101,187,0.12), transparent 70%), radial-gradient(320px 220px at 100% 100%, rgba(38,163,104,0.10), transparent 72%)",
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ px: 1, pb: 1.75, position: "relative", zIndex: 1 }}>
        <Typography sx={{ fontSize: 13, letterSpacing: 3.2, fontWeight: 900, color: "text.secondary", mb: 0.75 }}>
          POCKETFINANCE
        </Typography>
      </Box>

      <List
        dense
        disablePadding
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 0.25,
          position: "relative",
          zIndex: 1,
        }}
      >
        {mainNav.map((item) => {
          const active = location.pathname === item.to;
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={active}
              onClick={() => setMobileOpen(false)}
              sx={{
                minHeight: 50,
                borderRadius: 999,
                px: 1.5,
                mb: 0.75,
                justifyContent: "flex-start",
                gap: 0.5,
                color: active ? "#184f3d" : "text.primary",
                bgcolor: active ? "rgba(202, 239, 216, 0.88)" : "rgba(255,255,255,0.3)",
                border: active ? "1px solid rgba(85, 173, 125, 0.22)" : "1px solid rgba(15,23,42,0.04)",
                boxShadow: active ? "0px 12px 24px rgba(56, 127, 94, 0.12)" : "none",
                "&:hover": {
                  bgcolor: active ? "rgba(202, 239, 216, 0.96)" : "rgba(255,255,255,0.72)",
                  transform: "translateX(4px)",
                },
              }}
            >
              <Box
                sx={{
                  mr: 1.1,
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  color: "inherit",
                  opacity: active ? 1 : 0.78,
                  bgcolor: active ? "rgba(255,255,255,0.82)" : "rgba(56,86,168,0.06)",
                }}
              >
                {item.icon}
              </Box>
              <Typography sx={{ fontWeight: active ? 800 : 700, fontSize: 15 }}>{item.label}</Typography>
            </ListItemButton>
          );
        })}
      </List>

      <Box
        sx={{
          mt: "auto",
          pt: 2,
          px: 1.25,
          pb: 0.5,
          flexShrink: 0,
          borderTop: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 4,
          bgcolor: "rgba(255,255,255,0.5)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.25 }}>Hi {greetingName}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {expiryLabel}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "transparent" }}>
      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              display: "flex",
              overflow: "hidden",
              borderRight: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: "rgba(255,255,255,0.68)",
            },
          }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              display: "flex",
              overflow: "hidden",
              borderRight: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: "rgba(255,255,255,0.68)",
            },
          }}
        >
          {sidebar}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            minHeight: 76,
            px: { xs: 1.5, sm: 2, md: 3 },
            py: { xs: 1.25, md: 1.5 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 1, sm: 2 },
            borderBottom: "1px solid rgba(15,23,42,0.06)",
            bgcolor: "rgba(255,255,255,0.68)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            {isMobile && (
              <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <TextField
              placeholder={isMobile ? "Search transactions" : "Search transactions by merchant"}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runTransactionSearch();
              }}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 980,
                minWidth: 0,
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgba(255,255,255,0.9)",
                  boxShadow: "0px 12px 30px rgba(15, 23, 42, 0.05)",
                },
              }}
            />
          </Stack>

          <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} alignItems="center" sx={{ flexShrink: 0 }}>
            <Tooltip title={alertCount ? `${alertCount} notification${alertCount === 1 ? "" : "s"}` : "No alerts"}>
              <IconButton
                aria-label="Notifications"
                onClick={(event) => setNotifAnchorEl(event.currentTarget)}
                sx={{
                  border: "1px solid rgba(15,23,42,0.08)",
                  bgcolor: "rgba(255,255,255,0.92)",
                  boxShadow: "0px 10px 24px rgba(15, 23, 42, 0.07)",
                }}
              >
                <Badge color="error" badgeContent={alertCount} max={99} invisible={!alertCount}>
                  <NotificationsNoneIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton
              aria-label="User menu"
              onClick={(event) => setProfileAnchorEl(event.currentTarget)}
              sx={{
                border: "1px solid rgba(15,23,42,0.08)",
                bgcolor: "rgba(255,255,255,0.92)",
                boxShadow: "0px 10px 24px rgba(15, 23, 42, 0.07)",
              }}
            >
              <AccountCircleIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Menu
          anchorEl={notifAnchorEl}
          open={Boolean(notifAnchorEl)}
          onClose={() => setNotifAnchorEl(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 320, maxWidth: 420, p: 0.5 } }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem disabled sx={{ opacity: 0.85, fontWeight: 900 }}>
            Notifications
          </MenuItem>
          <Divider />
          {alerts.isPending && <MenuItem disabled>Checking alerts...</MenuItem>}
          {alerts.error && <MenuItem disabled>Failed to load alerts</MenuItem>}
          {!alerts.isPending && !alerts.error && !alertCount && <MenuItem disabled>No notifications</MenuItem>}
          {ruleAlerts.slice(0, 6).map((alert) => (
            <MenuItem key={alert.id} disabled sx={{ alignItems: "flex-start", whiteSpace: "normal", gap: 1, opacity: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={850}>Rule alert</Typography>
                <Typography variant="body2" color="text.secondary">
                  {alert.message}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {formatAlertTime(alert.createdAt)}
                </Typography>
              </Box>
              <Chip size="small" label="Rule" color="warning" variant="outlined" />
            </MenuItem>
          ))}
          {ruleAlerts.length > 0 && (
            <MenuItem
              onClick={() => {
                clearRuleAlerts();
                setNotifAnchorEl(null);
              }}
              sx={{ fontWeight: 800 }}
            >
              Clear rule alerts
            </MenuItem>
          )}
          {ruleAlerts.length > 0 && budgetAlerts.length > 0 && <Divider />}
          {budgetAlerts.slice(0, 8).map((alert) => (
            <MenuItem
              key={alert.budgetId}
              onClick={() => {
                setNotifAnchorEl(null);
                navigate("/budgets");
              }}
              sx={{ alignItems: "flex-start", whiteSpace: "normal", gap: 1 }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={850}>{alert.categoryName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {alert.percentUsed.toFixed(0)}% used • {formatMoney(alert.spentAmount, displayCountryCode)} / {formatMoney(alert.budgetAmount, displayCountryCode)}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={alert.status === "over" ? "Over" : "Warning"}
                color={alert.status === "over" ? "error" : "warning"}
                variant="outlined"
              />
            </MenuItem>
          ))}
          <Divider />
          <MenuItem
            onClick={() => {
              setNotifAnchorEl(null);
              navigate("/budgets");
            }}
          >
            View budgets
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={profileAnchorEl}
          open={Boolean(profileAnchorEl)}
          onClose={() => setProfileAnchorEl(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 220, p: 0.5 } }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              setProfileAnchorEl(null);
              navigate("/settings");
            }}
          >
            Settings
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setProfileAnchorEl(null);
              clear();
            }}
            sx={{ color: "error.main", fontWeight: 800 }}
          >
            Log out
          </MenuItem>
        </Menu>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              maxWidth: 1480,
              mx: "auto",
              animation: "pageEnter 420ms ease-out",
              "& > *": {
                position: "relative",
              },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
