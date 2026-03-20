import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "../../api/accounts";
import { queryClient } from "../../queryClient";
import type { Account } from "../../api/types";
import { countryOptions, getCountryOption } from "../../utils/countries";
import { formatMoney, getCurrencySymbol } from "../../utils/money";
import { PageHero } from "../../components/PageHero";

type FormState = {
  id?: string;
  name: string;
  type: string;
  countryCode: string;
  openingBalance: string;
  institutionName: string;
};

function defaultForm(): FormState {
  return { name: "", type: "bank", countryCode: "IN", openingBalance: "", institutionName: "" };
}

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

function parseOpeningBalance(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AccountsPage() {
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());

  const isEdit = !!form.id;
  const canSubmit = useMemo(() => form.name.trim() && form.type.trim() && form.countryCode.trim(), [form]);

  const totals = useMemo(() => {
    const items = accounts.data ?? [];
    const total = items.reduce((sum, account) => sum + account.currentBalance, 0);
    const primaryCountryCode = items[0]?.countryCode ?? "IN";
    return { total, count: items.length, primaryCountryCode };
  }, [accounts.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return updateAccount({
          id: form.id!,
          name: form.name.trim(),
          type: form.type.trim(),
          countryCode: form.countryCode,
          institutionName: form.institutionName.trim() || null,
        });
      }
      return createAccount({
        name: form.name.trim(),
        type: form.type.trim(),
        countryCode: form.countryCode,
        openingBalance: parseOpeningBalance(form.openingBalance),
        institutionName: form.institutionName.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async () => deleteAccount(confirm!.id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const openAdd = () => {
    setSubmitError(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (a: Account) => {
    setSubmitError(null);
    setForm({
      id: a.id,
      name: a.name,
      type: a.type,
      countryCode: a.countryCode,
      openingBalance: a.openingBalance ? String(a.openingBalance) : "",
      institutionName: a.institutionName ?? "",
    });
    setOpen(true);
  };

  return (
    <Box>
      <PageHero
        title="Accounts"
        description="Manage wallets and bank accounts with country-aware currencies."
        actions={
          <Button variant="contained" onClick={openAdd}>
            Add Account
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Balance</Typography>
              <Typography variant="h4">{formatMoney(totals.total, totals.primaryCountryCode)}</Typography>
              <Typography color="text.secondary" variant="body2">
                Displayed using primary account currency.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Accounts</Typography>
              <Typography variant="h4">{totals.count}</Typography>
              <Typography color="text.secondary" variant="body2">
                Countries: {[...new Set((accounts.data ?? []).map((account) => getCountryOption(account.countryCode).label))].join(", ") || "-"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {(accounts.data ?? []).map((account) => {
          const country = getCountryOption(account.countryCode);
          return (
            <Grid item xs={12} md={6} lg={4} key={account.id}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccountBalanceWalletRoundedIcon color="primary" />
                        <Typography variant="h6">{account.name}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={account.type} sx={{ textTransform: "capitalize" }} />
                        <Chip size="small" icon={<PublicRoundedIcon />} label={country.label} />
                      </Stack>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(account)} aria-label="Edit account">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setConfirm({ id: account.id, name: account.name })} aria-label="Delete account" sx={{ color: "error.main" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography color="text.secondary" variant="body2">Current Balance</Typography>
                    <Typography variant="h4" sx={{ color: account.currentBalance >= 0 ? "success.main" : "error.main" }}>
                      {formatMoney(account.currentBalance, account.countryCode)}
                    </Typography>
                  </Box>

                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography color="text.secondary" variant="body2">Opening</Typography>
                      <Typography fontWeight={700}>{formatMoney(account.openingBalance, account.countryCode)}</Typography>
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">Symbol</Typography>
                      <Typography fontWeight={700}>{getCurrencySymbol(account.countryCode)}</Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ mt: "auto" }}>
                    <Typography color="text.secondary" variant="body2">Institution</Typography>
                    <Typography>{account.institutionName ?? "-"}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!(accounts.data?.length) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">No accounts yet</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? "Edit Account" : "Add Account"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField required label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <TextField required label="Type" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} />
            <TextField
              select
              label="Country"
              value={form.countryCode}
              onChange={(e) => setForm((s) => ({ ...s, countryCode: e.target.value }))}
            >
              {countryOptions.map((country) => (
                <MenuItem key={country.code} value={country.code}>
                  {country.label} ({country.currency})
                </MenuItem>
              ))}
            </TextField>
            {!isEdit && (
              <TextField
                label="Opening Balance"
                type="text"
                value={form.openingBalance}
                onChange={(e) => setForm((s) => ({ ...s, openingBalance: e.target.value }))}
                helperText={`Currency: ${getCountryOption(form.countryCode).currency}`}
                inputProps={{ inputMode: "decimal" }}
              />
            )}
            <TextField
              label="Institution"
              value={form.institutionName}
              onChange={(e) => setForm((s) => ({ ...s, institutionName: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!canSubmit || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete account?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete <Typography component="span" fontWeight={600}>{confirm?.name}</Typography>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => del.mutate()} disabled={del.isPending}>
            {del.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


