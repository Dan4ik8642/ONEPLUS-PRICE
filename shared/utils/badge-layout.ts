export type BadgeProduct = { vegan: boolean, hit: boolean, isNew: boolean }
export type BadgeKind = "vegan" | "hit" | "new"

const badgeLabels: Record<BadgeKind, string> = {
  vegan: "ВЕГАН",
  hit: "ХИТ",
  new: "НОВИНКА",
}

export function productBadgeLayout(product: BadgeProduct) {
  const kinds: BadgeKind[] = []
  if (product.vegan) kinds.push("vegan")
  if (product.hit) kinds.push("hit")
  if (product.isNew) kinds.push("new")
  return kinds.map((kind, index) => ({ kind, label: badgeLabels[kind], topOffset: 14 + index * 31 }))
}
