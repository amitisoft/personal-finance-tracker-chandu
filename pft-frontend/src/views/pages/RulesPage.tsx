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
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHero } from "../../components/PageHero";
import { listRules, createRule, updateRule, deleteRule } from "../../api/rules";
import { listAccounts } from "../../api/accounts";
import { listCategories } from "../../api/categories";
import { queryClient } from "../../queryClient";
import type { Account, Category, Rule } from "../../api/types";

type RuleFormState = {
  id?: string;
  name: string;
  priority: string;
  isActive: boolean;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  actionType: string;
  actionValue: string;
  actionCategoryId: string;
};

const supportedConditionFields = new Set(["merchant", "amount", "type", "category"]);
const supportedActionTypes = new Set(["set_category", "add_tag", "trigger_alert"]);

function defaultForm(): RuleFormState {
  return {
    name: "",
    priority: "100",
    isActive: true,
    conditionField: "merchant",
    conditionOperator: "equals",
    conditionValue: "",
    actionType: "set_category",
    actionValue: "",
    actionCategoryId: "",
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

function fieldLabel(field: string) {
  switch (field) {
    case "merchant":
      return "merchant";
    case "amount":
      return "amount";
    case "type":
      return "type";
    case "note":
      return "note";
    case "category":
      return "category";
    case "account":
      return "account";
    default:
      return field;
  }
}

function operatorLabel(op: string) {
  switch (op) {
    case "equals":
      return "is";
    case "contains":
      return "contains";
    case "starts_with":
      return "starts with";
    case "ends_with":
      return "ends with";
    case "gt":
      return "is greater than";
    case "gte":
      return "is at least";
    case "lt":
      return "is less than";
    case "lte":
      return "is at most";
    default:
      return op;
  }
}

function formatCondition(rule: Rule, categories: Category[], accounts: Account[]) {
  const v = rule.condition?.value;
  let valueStr = typeof v === "string" ? v : typeof v === "number" ? String(v) : JSON.stringify(v);

  if (rule.condition?.field === "category" && typeof v === "string") {
    valueStr = categoryById(categories, v)?.name ?? "Unknown category";
  }

  if (rule.condition?.field === "account" && typeof v === "string") {
    valueStr = accountById(accounts, v)?.name ?? "Unknown account";
  }

  return `${fieldLabel(rule.condition.field)} ${operatorLabel(rule.condition.operator)} ${valueStr}`;
}

function formatAction(rule: Rule, categories: Category[]) {
  const v = rule.action?.value;
  if (rule.action?.type === "set_category") {
    if (typeof v === "string") return `Set category to ${v}`;
    if (v && typeof v === "object" && "categoryId" in v) {
      const category = categoryById(categories, String((v as { categoryId?: unknown }).categoryId ?? ""));
      return `Set category to ${category?.name ?? "Unknown category"}`;
    }
  }

  if (rule.action?.type === "add_tag") {
    return `Add tag ${typeof v === "string" ? `"${v}"` : ""}`.trim();
  }

  if (rule.action?.type === "set_note") {
    return `Set note to ${typeof v === "string" ? `"${v}"` : ""}`.trim();
  }

  if (rule.action?.type === "trigger_alert") {
    return `Show alert ${typeof v === "string" ? `"${v}"` : ""}`.trim();
  }

  const valueStr = typeof v === "string" ? v : v && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
  return `${rule.action.type} ${valueStr}`.trim();
}

function categoryById(categories: Category[], id: string) {
  return categories.find((c) => c.id === id) ?? null;
}

function accountById(accounts: Account[], id: string) {
  return accounts.find((a) => a.id === id) ?? null;
}

export function RulesPage() {
  const rules = useQuery({ queryKey: ["rules"], queryFn: listRules });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories(false) });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });

  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Rule | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(() => defaultForm());

  const isPending = rules.isPending || categories.isPending || accounts.isPending;
  const loadError = rules.error ?? categories.error ?? accounts.error;

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!form.conditionField.trim()) return false;
    if (!form.conditionOperator.trim()) return false;
    if (!String(form.conditionValue ?? "").trim()) return false;
    if (!form.actionType.trim()) return false;
    if (form.actionType === "set_category") {
      if (!form.actionCategoryId) return false;
    } else {
      if (!form.actionValue.trim()) return false;
    }
    return true;
  }, [form]);

  const isEdit = !!form.id;

  const operatorOptions = useMemo(() => {
    if (form.conditionField === "amount") {
      return [
        { value: "gt", label: "Greater than" },
        { value: "gte", label: "Greater or equal" },
        { value: "lt", label: "Less than" },
        { value: "lte", label: "Less or equal" },
        { value: "equals", label: "Equals" },
      ];
    }
    if (form.conditionField === "category") {
      return [{ value: "equals", label: "Equals" }];
    }
    return [
      { value: "equals", label: "Equals" },
      { value: "contains", label: "Contains" },
      { value: "starts_with", label: "Starts with" },
      { value: "ends_with", label: "Ends with" },
    ];
  }, [form.conditionField]);

  const dialogSelectProps = useMemo(
    () => ({
      MenuProps: { disablePortal: true },
    }),
    [],
  );

  const upsert = useMutation({
    mutationFn: async () => {
      const conditionValue =
        form.conditionField === "amount" ? Number(form.conditionValue) : String(form.conditionValue ?? "").trim();

      const actionValue =
        form.actionType === "set_category"
          ? { categoryId: form.actionCategoryId }
          : String(form.actionValue).trim();

      const payload = {
        name: form.name.trim(),
        priority: Number(form.priority || "100"),
        isActive: form.isActive,
        condition: {
          field: form.conditionField,
          operator: form.conditionOperator,
          value: conditionValue,
        },
        action: {
          type: form.actionType,
          value: actionValue,
        },
      };

      if (isEdit) return updateRule(form.id!, payload);
      return createRule(payload);
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const toggleActive = useMutation({
    mutationFn: async (rule: Rule) => {
      return updateRule(rule.id, {
        name: rule.name,
        priority: rule.priority,
        isActive: !rule.isActive,
        condition: rule.condition,
        action: rule.action,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });

  const del = useMutation({
    mutationFn: async () => deleteRule(confirmDelete!.id),
    onSuccess: async () => {
      setConfirmDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const openAdd = () => {
    setForm(defaultForm());
    setSubmitError(null);
    setOpen(true);
  };

  const openEdit = (r: Rule) => {
    const conditionValue = r.condition?.value;
    const actionValue = r.action?.value;

    let actionCategoryId = "";
    let actionValueText = "";
    if (r.action.type === "set_category" && actionValue && typeof actionValue === "object" && "categoryId" in actionValue) {
      actionCategoryId = String((actionValue as any).categoryId ?? "");
    } else {
      actionValueText = typeof actionValue === "string" ? actionValue : JSON.stringify(actionValue ?? "");
    }

    setForm({
      id: r.id,
      name: r.name,
      priority: String(r.priority ?? 100),
      isActive: !!r.isActive,
      conditionField: supportedConditionFields.has(r.condition?.field ?? "") ? r.condition.field : "merchant",
      conditionOperator: r.condition?.operator ?? "equals",
      conditionValue: typeof conditionValue === "string" || typeof conditionValue === "number" ? String(conditionValue) : JSON.stringify(conditionValue ?? ""),
      actionType: supportedActionTypes.has(r.action?.type ?? "") ? r.action.type : "add_tag",
      actionValue: supportedActionTypes.has(r.action?.type ?? "") ? actionValueText : "",
      actionCategoryId,
    });
    setSubmitError(null);
    setOpen(true);
  };

  const categoriesList = categories.data ?? [];
  const accountsList = accounts.data ?? [];

  return (
    <Box>
      <PageHero
        title="Rules"
        description="Automate categorization, tagging, and alerts using simple IF/THEN rules."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            New rule
          </Button>
        }
      />

      {isPending && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(loadError)}
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1.5 }}>
            Active rules run automatically when you add a transaction.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Rules run from lowest priority number to highest. When a rule matches, it can set the category, add a tag,
            or show an alert on the transaction you just created. Examples: merchant is Uber then set category to
            Transport, amount is greater than 5000 then show alert, category is Food then add tag "monthly-food".
          </Alert>
          <Divider sx={{ mb: 2 }} />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rule</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Manage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rules.data ?? []).map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 800 }}>{r.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatCondition(r, categoriesList, accountsList)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatAction(r, categoriesList)}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={r.isActive ? "Enabled" : "Disabled"} color={r.isActive ? "success" : "default"} variant="outlined" />
                      <Switch
                        checked={r.isActive}
                        onChange={() => toggleActive.mutate(r)}
                        size="small"
                        inputProps={{ "aria-label": `toggle ${r.name}` }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openEdit(r)} size="small" aria-label={`edit ${r.name}`}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => setConfirmDelete(r)} size="small" aria-label={`delete ${r.name}`}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {(rules.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Alert severity="info">No rules yet. Create one to auto-categorize merchants or trigger alerts.</Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? "Edit rule" : "New rule"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Priority"
                type="number"
                value={form.priority}
                onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
                helperText="Lower runs first"
                sx={{ flex: 1 }}
              />
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} />}
                label={form.isActive ? "Enabled" : "Disabled"}
                sx={{ flex: 1, justifyContent: "space-between", ml: 0 }}
              />
            </Stack>

            <Divider />

            <Typography fontWeight={900}>IF</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                label="Field"
                value={form.conditionField}
                SelectProps={dialogSelectProps}
                onChange={(e) => {
                  const nextField = e.target.value;
                  setForm((s) => {
                    const allowed = new Set(
                      nextField === "amount"
                        ? ["gt", "gte", "lt", "lte", "equals"]
                        : nextField === "category" || nextField === "account"
                          ? ["equals"]
                          : ["equals", "contains", "starts_with", "ends_with"],
                    );
                    const nextOperator = allowed.has(s.conditionOperator) ? s.conditionOperator : "equals";
                    return { ...s, conditionField: nextField, conditionOperator: nextOperator };
                  });
                }}
                sx={{ flex: 1 }}
              >
                <MenuItem value="merchant">Merchant</MenuItem>
                <MenuItem value="amount">Amount</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="category">Category</MenuItem>
              </TextField>

              <TextField
                select
                label="Operator"
                value={form.conditionOperator}
                onChange={(e) => setForm((s) => ({ ...s, conditionOperator: e.target.value }))}
                SelectProps={dialogSelectProps}
                sx={{ flex: 1 }}
              >
                {operatorOptions.map((op) => (
                  <MenuItem key={op.value} value={op.value}>
                    {op.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {form.conditionField === "category" ? (
              <TextField
                select
                label="Value"
                value={form.conditionValue}
                onChange={(e) => setForm((s) => ({ ...s, conditionValue: e.target.value }))}
                SelectProps={dialogSelectProps}
              >
                <MenuItem value="">Choose...</MenuItem>
                {categoriesList.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Value"
                type={form.conditionField === "amount" ? "number" : "text"}
                value={form.conditionValue}
                onChange={(e) => setForm((s) => ({ ...s, conditionValue: e.target.value }))}
              />
            )}

            <Divider />

            <Typography fontWeight={900}>THEN</Typography>
            <TextField
              select
              label="Action"
              value={form.actionType}
              SelectProps={dialogSelectProps}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  actionType: e.target.value,
                  actionValue: "",
                  actionCategoryId: "",
                }))
              }
            >
              <MenuItem value="set_category">Set category</MenuItem>
              <MenuItem value="add_tag">Add tag</MenuItem>
              <MenuItem value="trigger_alert">Trigger alert</MenuItem>
            </TextField>

            {form.actionType === "set_category" ? (
              <TextField
                select
                label="Category"
                value={form.actionCategoryId}
                onChange={(e) => setForm((s) => ({ ...s, actionCategoryId: e.target.value }))}
                SelectProps={dialogSelectProps}
              >
                <MenuItem value="">Choose...</MenuItem>
                {categoriesList.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Value"
                value={form.actionValue}
                onChange={(e) => setForm((s) => ({ ...s, actionValue: e.target.value }))}
                placeholder={form.actionType === "add_tag" ? "monthly-food" : form.actionType === "trigger_alert" ? "Large transaction detected" : ""}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={upsert.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!canSubmit || upsert.isPending}
            onClick={() => {
              setSubmitError(null);
              upsert.mutate();
            }}
          >
            {upsert.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete rule?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete <Typography component="span" fontWeight={800}>{confirmDelete?.name}</Typography>?
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
