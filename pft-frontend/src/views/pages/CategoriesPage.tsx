import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../../api/categories";
import { queryClient } from "../../queryClient";
import type { Category } from "../../api/types";
import { renderCategoryIcon } from "../../components/CategoryIcon";
import { PageHero } from "../../components/PageHero";

type FormState = {
  id?: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  isArchived: boolean;
};

function defaultForm(): FormState {
  return { name: "", type: "expense", color: "", icon: "", isArchived: false };
}

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

export function CategoriesPage() {
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories(true) });
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const isEdit = !!form.id;

  const canSubmit = useMemo(() => form.name.trim() && form.type.trim(), [form]);

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return updateCategory(form.id!, {
          name: form.name.trim(),
          type: form.type.trim(),
          color: form.color.trim() || null,
          icon: form.icon.trim() || null,
          isArchived: form.isArchived,
        });
      }
      return createCategory({
        name: form.name.trim(),
        type: form.type.trim(),
        color: form.color.trim() || undefined,
        icon: form.icon.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setSubmitError(errorMessage(err)),
  });

  const archive = useMutation({
    mutationFn: async () => deleteCategory(confirm!.id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setSubmitError(errorMessage(err)),
  });

  const openAdd = () => {
    setSubmitError(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setSubmitError(null);
    setForm({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color ?? "",
      icon: category.icon ?? "",
      isArchived: category.isArchived,
    });
    setOpen(true);
  };

  const activeCount = (categories.data ?? []).filter((category) => !category.isArchived).length;
  const archivedCount = (categories.data ?? []).filter((category) => category.isArchived).length;

  return (
    <Box>
      <PageHero
        title="Categories"
        description="Organize income and spending with icons, colors, and archived states."
        actions={
          <Button variant="contained" onClick={openAdd}>
            Add Category
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Categories</Typography>
              <Typography variant="h4">{categories.data?.length ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Active</Typography>
              <Typography variant="h4" sx={{ color: "success.main" }}>{activeCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Archived</Typography>
              <Typography variant="h4" sx={{ color: "warning.main" }}>{archivedCount}</Typography>
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
        {(categories.data ?? []).map((category) => {
          const accent = category.color?.trim() || (category.type === "income" ? "#2e7d32" : "#1565c0");
          return (
            <Grid item xs={12} md={6} lg={4} key={category.id}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 3,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: `${accent}16`,
                          color: accent,
                        }}
                      >
                        {renderCategoryIcon(category.name, category.type, category.icon)}
                      </Box>
                      <Box>
                        <Typography variant="h6">{category.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip size="small" label={category.type} sx={{ textTransform: "capitalize" }} color={category.type === "income" ? "success" : "primary"} />
                          <Chip size="small" label={category.isArchived ? "Archived" : "Active"} variant="outlined" />
                        </Stack>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(category)} aria-label="Edit category">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setConfirm({ id: category.id, name: category.name })} aria-label="Archive category" sx={{ color: "error.main" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">Icon</Typography>
                    <Typography fontWeight={700}>{category.icon?.trim() || "Auto"}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">Color</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 14, height: 14, borderRadius: 999, bgcolor: accent }} />
                      <Typography fontWeight={700}>{category.color?.trim() || accent}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!(categories.data?.length) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">No categories yet</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))} />
            <TextField select label="Type" value={form.type} onChange={(e) => setForm((state) => ({ ...state, type: e.target.value }))}>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </TextField>
            <TextField label="Color" value={form.color} onChange={(e) => setForm((state) => ({ ...state, color: e.target.value }))} helperText="Optional hex or named color" />
            <TextField label="Icon" value={form.icon} onChange={(e) => setForm((state) => ({ ...state, icon: e.target.value }))} helperText="Optional icon hint. Leave blank for auto icon." />
            {isEdit && (
              <FormControlLabel
                control={<Checkbox checked={form.isArchived} onChange={(e) => setForm((state) => ({ ...state, isArchived: e.target.checked }))} />}
                label="Archived"
              />
            )}
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
        <DialogTitle>Archive category?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Archive <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{confirm?.name}</Box>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={archive.isPending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => archive.mutate()} disabled={archive.isPending}>
            {archive.isPending ? "Archiving..." : "Archive"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
