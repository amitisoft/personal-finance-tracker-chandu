import { useEffect, useMemo, useState } from "react";
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
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "../../api/transactions";
import { listAccounts } from "../../api/accounts";
import { listCategories } from "../../api/categories";
import { exportTransactionsCsv } from "../../api/reports";
import { queryClient } from "../../queryClient";
import type { Account, Category, Transaction } from "../../api/types";
import { categoryColor } from "../../utils/categoryColors";
import { formatMoney, getCurrencySymbol } from "../../utils/money";
import { formatDisplayDate } from "../../utils/dates";
import { renderCategoryIcon } from "../../components/CategoryIcon";
import { PageHero } from "../../components/PageHero";

type TxFormState = {
  id?: string;
  type: "expense" | "income" | "transfer";
  amount: string;
  date: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  merchant: string;
  note: string;
  paymentMethod: string;
  tags: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm(): TxFormState {
  return {
    type: "expense",
    amount: "",
    date: todayIso(),
    accountId: "",
    toAccountId: "",
    categoryId: "",
    merchant: "",
    note: "",
    paymentMethod: "",
    tags: "",
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

function categoryChipSx(label: string) {
  const c = categoryColor(label);
  return {
    bgcolor: `${c}1A`,
    borderColor: `${c}55`,
    color: c,
    textTransform: "capitalize",
  } as const;
}

function categoryForId(categories: Category[], categoryId?: string | null) {
  return categories.find((category) => category.id === categoryId) ?? null;
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const add = searchParams.get("add");
    if (add !== "1") return;

    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<TxFormState>(() => defaultForm());
  const [isDownloading, setIsDownloading] = useState(false);

  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories(false) });

  const accountById = useMemo(() => new Map((accounts.data ?? []).map((a) => [a.id, a])), [accounts.data]);
  const categoryById = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);

  const filters = useMemo(() => {
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    const type = searchParams.get("type") ?? "";
    const accountId = searchParams.get("accountId") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";
    const q = searchParams.get("q") ?? "";
    return { from, to, type, accountId, categoryId, q };
  }, [searchParams]);

  const displayCountryCode = filters.accountId
    ? accountById.get(filters.accountId)?.countryCode ?? "IN"
    : (accounts.data ?? [])[0]?.countryCode ?? "IN";

  const formCountryCode = form.accountId
    ? accountById.get(form.accountId)?.countryCode ?? displayCountryCode
    : displayCountryCode;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const tx = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () =>
      listTransactions({
        page: 1,
        pageSize: 50,
        from: filters.from || undefined,
        to: filters.to || undefined,
        type: filters.type || undefined,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        search: filters.q || undefined,
      }),
  });

  const ensureAccountDefaults = () => {
    const ids = (accounts.data ?? []).map((a) => a.id);
    if (!ids.length) return;

    setForm((s) => {
      const accountId = s.accountId || ids[0];
      let toAccountId = s.toAccountId;
      if (s.type === "transfer") {
        const preferred = ids.find((id) => id !== accountId) ?? "";
        if (!toAccountId || toAccountId === accountId) toAccountId = preferred;
      } else {
        toAccountId = "";
      }
      return { ...s, accountId, toAccountId };
    });
  };

  useEffect(() => {
    if (!open) return;
    ensureAccountDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.type, accounts.data?.length]);

  const isEdit = !!form.id;

  const canSubmit = useMemo(() => {
    if (!form.accountId) return false;
    if (Number(form.amount) <= 0) return false;
    if (form.type === "transfer") {
      if (!form.toAccountId) return false;
      if (form.toAccountId === form.accountId) return false;
      return true;
    }
    return !!form.categoryId;
  }, [form]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        date: form.date,
        accountId: form.accountId,
        toAccountId: form.type === "transfer" ? form.toAccountId : null,
        categoryId: form.type === "transfer" ? null : form.categoryId,
        merchant: form.merchant || undefined,
        note: form.note || undefined,
        paymentMethod: form.paymentMethod || undefined,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined,
      };

      if (isEdit) return updateTransaction(form.id!, payload);
      return createTransaction(payload);
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async () => deleteTransaction(confirmDelete!.id),
    onSuccess: async () => {
      setConfirmDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const downloadCsv = async () => {
    setIsDownloading(true);
    setSubmitError(null);
    try {
      const blob = await exportTransactionsCsv({
        startDate: filters.from || undefined,
        endDate: filters.to || undefined,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.type || undefined,
        search: filters.q || undefined,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${todayIso()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setIsDownloading(false);
    }
  };

  const openAdd = () => {
    setSubmitError(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setSubmitError(null);
    setForm({
      id: t.id,
      type: t.type,
      amount: String(t.amount),
      date: t.date,
      accountId: t.accountId,
      toAccountId: t.toAccountId ?? "",
      categoryId: t.categoryId ?? "",
      merchant: t.merchant ?? "",
      note: t.note ?? "",
      paymentMethod: t.paymentMethod ?? "",
      tags: (t.tags ?? []).join(", "),
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setSubmitError(null);
    setForm(defaultForm());
  };

  const noAccounts = accounts.isSuccess && (accounts.data ?? []).length === 0;

  return (
    <Box>
      <PageHero
        title="Transactions"
        description="Track income, expenses, and transfers with filters and export support."
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={isDownloading}>
              {isDownloading ? "Downloading..." : "Download CSV"}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              Add Transaction
            </Button>
          </Stack>
        }
      />

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
            <TextField
              label="From"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.from}
              onChange={(e) => setFilter("from", e.target.value)}
              sx={{ minWidth: 170 }}
            />
            <TextField
              label="To"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.to}
              onChange={(e) => setFilter("to", e.target.value)}
              sx={{ minWidth: 170 }}
            />
            <TextField select label="Type" value={filters.type} onChange={(e) => setFilter("type", e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
            </TextField>
            <TextField select required label="Account" value={filters.accountId} onChange={(e) => setFilter("accountId", e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">All</MenuItem>
              {(accounts.data ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select required
              label="Category" value={filters.categoryId} onChange={(e) => setFilter("categoryId", e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">All</MenuItem>
              {(categories.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Search"
              placeholder="Merchant or note"
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Merchant</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell width={110} />
              </TableRow>
            </TableHead>
            <TableBody>
              {(tx.data?.items ?? []).map((transaction) => {
                const account = accountById.get(transaction.accountId) as Account | undefined;
                const category = categoryById.get(transaction.categoryId ?? "");
                return (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{formatDisplayDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.merchant ?? "-"}</TableCell>
                    <TableCell>
                      {transaction.type === "transfer" ? (
                        "-"
                      ) : category ? (
                        <Chip
                          size="small"
                          icon={renderCategoryIcon(category.name, category.type, category.icon, { fontSize: "small" })}
                          label={category.name}
                          variant="outlined"
                          sx={categoryChipSx(category.name)}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{account?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={transaction.type}
                        color={transaction.type === "income" ? "success" : transaction.type === "expense" ? "error" : "default"}
                        variant="outlined"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        component="span"
                        fontWeight={700}
                        color={transaction.type === "income" ? "success.main" : transaction.type === "expense" ? "error.main" : "text.primary"}
                      >
                        {formatMoney(transaction.amount, account?.countryCode ?? displayCountryCode)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(transaction)} aria-label="Edit transaction" sx={{ color: "text.secondary" }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setConfirmDelete({ id: transaction.id, label: transaction.merchant ?? transaction.type })}
                        aria-label="Delete transaction"
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!(tx.data?.items?.length) && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ sx: { overflow: "hidden" } }}>
        <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {noAccounts && (
              <Alert severity="warning">
                No accounts found. Create an account first (Accounts page) to save transactions.
              </Alert>
            )}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75 }}>
                Type
              </Typography>
              <ToggleButtonGroup
                fullWidth
                exclusive
                value={form.type}
                onChange={(_, value) => {
                  if (!value) return;
                  setForm((s) => ({
                    ...s,
                    type: value as TxFormState["type"],
                    toAccountId: "",
                    categoryId: "",
                  }));
                }}
                sx={{
                  bgcolor: "rgba(15,23,42,0.04)",
                  borderRadius: 3,
                  p: 0.25,
                  "& .MuiToggleButton-root": {
                    border: "none",
                    textTransform: "capitalize",
                    fontWeight: 800,
                    borderRadius: 3,
                  },
                }}
              >
                <ToggleButton value="expense" sx={{ color: "error.main" }}>
                  Expense
                </ToggleButton>
                <ToggleButton value="income" sx={{ color: "success.main" }}>
                  Income
                </ToggleButton>
                <ToggleButton value="transfer">Transfer</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              required
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
              InputProps={{ startAdornment: <InputAdornment position="start">{getCurrencySymbol(formCountryCode)}</InputAdornment> }}
            />

            <TextField
              required
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            />

            <TextField select required label="Account" value={form.accountId} onChange={(e) => setForm((s) => ({ ...s, accountId: e.target.value }))}>
              {(accounts.data ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>

            {form.type === "transfer" && (
              <TextField
                select
                required
                label="To Account"
                value={form.toAccountId}
                onChange={(e) => setForm((s) => ({ ...s, toAccountId: e.target.value }))}
                helperText={form.toAccountId && form.toAccountId === form.accountId ? "Choose a different account." : " "}
                error={!!form.toAccountId && form.toAccountId === form.accountId}
              >
                {(accounts.data ?? []).map((a) => (
                  <MenuItem key={a.id} value={a.id} disabled={a.id === form.accountId}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              required
              label="Category"
              disabled={form.type === "transfer"}
              value={form.categoryId}
              onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
            >
              {(categories.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(e) => setForm((s) => ({ ...s, paymentMethod: e.target.value }))}
              placeholder="Cash, Card, UPI, Bank transfer"
            />

            <Divider />

            <TextField label="Merchant" value={form.merchant} onChange={(e) => setForm((s) => ({ ...s, merchant: e.target.value }))} />
            <TextField label="Note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} multiline minRows={2} />
            <TextField label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!canSubmit || save.isPending || noAccounts}
            onClick={() => {
              setSubmitError(null);
              save.mutate();
            }}
          >
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete transaction?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete <Typography component="span" fontWeight={600}>{confirmDelete?.label}</Typography>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={del.isPending}>
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




