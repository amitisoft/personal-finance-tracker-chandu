import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { listInsights, getHealthScore } from "../../api/insights";
import { PageHero } from "../../components/PageHero";
import { formatMoney } from "../../utils/money";
import { listAccounts } from "../../api/accounts";

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

function severityColor(severity: string) {
  switch ((severity ?? "").toLowerCase()) {
    case "success":
      return "success" as const;
    case "error":
      return "error" as const;
    case "warning":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export function InsightsPage() {
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const cards = useQuery({ queryKey: ["insights", "cards"], queryFn: listInsights });
  const health = useQuery({ queryKey: ["insights", "health-score"], queryFn: getHealthScore });

  const isPending = accounts.isPending || cards.isPending || health.isPending;
  const loadError = accounts.error ?? cards.error ?? health.error;

  const countryCode = (accounts.data ?? [])[0]?.countryCode ?? "IN";

  return (
    <Box>
      <PageHero
        title="Insights"
        description="Personalized insights, health score breakdown, and month-over-month signals."
      />

      {isPending && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(loadError)}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography fontWeight={900}>Financial health score</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {health.data?.from ? `Range: ${health.data.from} → ${health.data.to}` : " "}
                  </Typography>
                </Box>
                <Chip
                  label={health.data ? `${health.data.score}/100` : "--"}
                  color={(health.data?.score ?? 0) >= 80 ? "success" : (health.data?.score ?? 0) >= 60 ? "info" : "warning"}
                  variant="outlined"
                />
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Income: {formatMoney(health.data?.details.incomeTotal ?? 0, countryCode)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expense: {formatMoney(health.data?.details.expenseTotal ?? 0, countryCode)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cash buffer: {health.data?.details.cashBufferMonths ?? 0} months
                </Typography>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Breakdown
              </Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">
                  Savings rate: {health.data?.breakdown.savingsRateScore ?? "--"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expense stability: {health.data?.breakdown.expenseStabilityScore ?? "--"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Budget adherence: {health.data?.breakdown.budgetAdherenceScore ?? "--"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cash buffer: {health.data?.breakdown.cashBufferScore ?? "--"}
                </Typography>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Suggestions
              </Typography>
              {(health.data?.suggestions ?? []).map((s) => (
                <Typography key={s} variant="body2" color="text.secondary">
                  • {s}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Grid container spacing={2.5}>
            {(cards.data ?? []).map((c) => (
              <Grid key={`${c.type}-${c.title}`} item xs={12} md={6}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                          {c.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {c.message}
                        </Typography>
                      </Box>
                      <Chip size="small" label={c.severity} color={severityColor(c.severity)} variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>
                      Month: {c.generatedForMonth}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {(cards.data ?? []).length === 0 && (
              <Grid item xs={12}>
                <Alert severity="info">No insights yet. Add more transactions for month-over-month signals.</Alert>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

