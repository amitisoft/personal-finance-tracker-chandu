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
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createRecurring, deleteRecurring, listRecurring, updateRecurring } from "../../api/recurring";
import { listAccounts } from "../../api/accounts";
import { listCategories } from "../../api/categories";
import { queryClient } from "../../queryClient";
import type { RecurringItem } from "../../api/types";
import { formatMoney } from "../../utils/money";
import { formatDisplayDate } from "../../utils/dates";
import { renderCategoryIcon } from "../../components/CategoryIcon";
import { PageHero } from "../../components/PageHero";

type FormState = {
  id?: string;
  title: string;
  type: string;
  amount: string;
  frequency: string;
  startDate: string;
  endDate: string;
  nextRunDate: string;
  accountId: string;
  categoryId: string;
  autoCreateTransaction: boolean;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function defaultForm(): FormState {
  const today = todayIso();
  return {
    title: "",
    type: "expense",
    amount: "",
    frequency: "monthly",
    startDate: today,
    endDate: "",
    nextRunDate: today,
    accountId: "",
    categoryId: "",
    autoCreateTransaction: true,
  };
}

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

export function RecurringPage() {
  const items = useQuery({ queryKey: ["recurring"], queryFn: listRecurring });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories(false) });

  const accountById = useMemo(() => new Map((accounts.data ?? []).map((account) => [account.id, account])), [accounts.data]);
  const categoryById = useMemo(() => new Map((categories.data ?? []).map((category) => [category.id, category])), [categories.data]);
  const displayCountryCode = (accounts.data ?? [])[0]?.countryCode ?? "IN";

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const isEdit = !!form.id;

  const canSubmit = useMemo(() => form.title.trim() && !!parseAmount(form.amount) && form.frequency.trim(), [form]);

  const save = useMutation({
    mutationFn: async () => {
      const amount = parseAmount(form.amount);
      if (!amount) throw new Error("Amount must be greater than 0.");

      const payload = {
        title: form.title.trim(),
        type: form.type.trim(),
        amount,
        frequency: form.frequency.trim(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        nextRunDate: form.nextRunDate,
        accountId: form.accountId || null,
        categoryId: form.categoryId || null,
        autoCreateTransaction: form.autoCreateTransaction,
      };

      if (isEdit) return updateRecurring(form.id!, payload);
      return createRecurring(payload);
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async () => deleteRecurring(confirm!.id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const openAdd = () => {
    setSubmitError(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (r: RecurringItem) => {
    setSubmitError(null);
    setForm({
      id: r.id,
      title: r.title,
      type: r.type,
      amount: String(r.amount),
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate ?? "",
      nextRunDate: r.nextRunDate,
      accountId: r.accountId ?? "",
      categoryId: r.categoryId ?? "",
      autoCreateTransaction: r.autoCreateTransaction,
    });
    setOpen(true);
  };

  return (
    <Box>
      <PageHero
        title="Recurring"
        description="Track upcoming bills and automate repeating transactions."
        actions={
          <Button variant="contained" onClick={openAdd}>
            New Recurring Item
          </Button>
        }
      />

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {(items.data ?? []).map((item) => {
          const account = item.accountId ? accountById.get(item.accountId) : null;
          const category = item.categoryId ? categoryById.get(item.categoryId) : null;
          const countryCode = account?.countryCode ?? displayCountryCode;

          return (
            <Grid item xs={12} md={6} lg={4} key={item.id}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <EventRepeatRoundedIcon color="primary" />
                        <Typography variant="h6">{item.title}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={item.type} color={item.type === "income" ? "success" : "error"} sx={{ textTransform: "capitalize" }} />
                        <Chip size="small" label={item.frequency} variant="outlined" sx={{ textTransform: "capitalize" }} />
                        <Chip size="small" label={item.autoCreateTransaction ? "Auto-create on" : "Manual review"} />
                      </Stack>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(item)} aria-label="Edit recurring">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setConfirm({ id: item.id, title: item.title })} aria-label="Delete recurring" sx={{ color: "error.main" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Typography variant="h4" sx={{ color: item.type === "income" ? "success.main" : "error.main" }}>
                    {formatMoney(item.amount, countryCode)}
                  </Typography>

                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography color="text.secondary" variant="body2">Next run</Typography>
                      <Typography fontWeight={700}>{formatDisplayDate(item.nextRunDate)}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography color="text.secondary" variant="body2">Start date</Typography>
                      <Typography fontWeight={700}>{formatDisplayDate(item.startDate)}</Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                      <AccountBalanceWalletRoundedIcon fontSize="small" color="action" />
                      <Box>
                        <Typography color="text.secondary" variant="body2">Account</Typography>
                        <Typography>{account?.name ?? "-"}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                      {renderCategoryIcon(category?.name, category?.type, category?.icon, { fontSize: "small", color: "action" })}
                      <Box>
                        <Typography color="text.secondary" variant="body2">Category</Typography>
                        <Typography>{category?.name ?? "-"}</Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!(items.data?.length) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">No recurring items yet</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? "Edit Recurring Item" : "New Recurring Item"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField required label="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            <TextField select required label="Type" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </TextField>
            <TextField
              required
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField required label="Frequency" value={form.frequency} onChange={(e) => setForm((s) => ({ ...s, frequency: e.target.value }))} />
            <TextField select label="Account (optional)" value={form.accountId} onChange={(e) => setForm((s) => ({ ...s, accountId: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {(accounts.data ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Category (optional)" value={form.categoryId} onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {(categories.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField required label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
            <TextField label="End Date (optional)" type="date" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} />
            <TextField required label="Next Run Date" type="date" InputLabelProps={{ shrink: true }} value={form.nextRunDate} onChange={(e) => setForm((s) => ({ ...s, nextRunDate: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={form.autoCreateTransaction} onChange={(e) => setForm((s) => ({ ...s, autoCreateTransaction: e.target.checked }))} />}
              label="Auto-create transactions"
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
        <DialogTitle>Delete recurring item?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete <Typography component="span" fontWeight={600}>{confirm?.title}</Typography>?
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

