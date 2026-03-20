import type { SvgIconProps } from "@mui/material/SvgIcon";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import FlightRoundedIcon from "@mui/icons-material/FlightRounded";
import SubscriptionsRoundedIcon from "@mui/icons-material/SubscriptionsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import LaptopMacRoundedIcon from "@mui/icons-material/LaptopMacRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";

const iconByKey = {
  food: RestaurantRoundedIcon,
  rent: HomeWorkRoundedIcon,
  utilities: BoltRoundedIcon,
  transport: DirectionsCarRoundedIcon,
  entertainment: MovieRoundedIcon,
  shopping: ShoppingBagRoundedIcon,
  health: FavoriteRoundedIcon,
  education: SchoolRoundedIcon,
  travel: FlightRoundedIcon,
  subscriptions: SubscriptionsRoundedIcon,
  salary: PaymentsRoundedIcon,
  freelance: LaptopMacRoundedIcon,
  bonus: WorkRoundedIcon,
  investment: TrendingUpRoundedIcon,
  gift: CardGiftcardRoundedIcon,
  refund: ReplayRoundedIcon,
  other: WalletRoundedIcon,
  income: PaymentsRoundedIcon,
  expense: WalletRoundedIcon,
  transfer: RepeatRoundedIcon,
  recurring: RepeatRoundedIcon,
  category: CategoryRoundedIcon,
} as const;

export function getCategoryIconComponent(name?: string | null, type?: string | null, icon?: string | null) {
  const normalizedIcon = (icon ?? "").trim().toLowerCase();
  const normalizedName = (name ?? "").trim().toLowerCase();
  const normalizedType = (type ?? "").trim().toLowerCase();

  return (
    iconByKey[normalizedIcon as keyof typeof iconByKey] ??
    iconByKey[normalizedName as keyof typeof iconByKey] ??
    iconByKey[normalizedType as keyof typeof iconByKey] ??
    CategoryRoundedIcon
  );
}

export function renderCategoryIcon(
  name?: string | null,
  type?: string | null,
  icon?: string | null,
  props?: SvgIconProps,
) {
  const IconComponent = getCategoryIconComponent(name, type, icon);
  return <IconComponent {...props} />;
}
