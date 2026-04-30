"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { 
  Package, 
  Users, 
  Building2,
  ShoppingCart,
  Activity,
  Mail,
  Calendar,
  Heart,
  Layers,
  Euro,
  AlertCircle,
  Lock,
  Sparkles,
  Shield,
  TrendingUp,
  Boxes,
  ArrowUpRight,
  ArrowLeft,
  Globe,
} from "lucide-react"

const ADMIN_EMAIL = "kalinbk870@gmail.com"
const ADMIN_PASSWORD = "1324"

interface DashboardStats {
  totalComponents: number
  totalCategories: number
  totalBrands: number
  totalUsers: number
  totalBuilds: number
  totalPublicBuilds: number
  totalHiddenBuilds: number
  totalCommunityCreators: number
  avgBuildPrice: number
  componentsInStock: number
  componentsOutOfStock: number
  totalFavorites: number
}

interface UserProfile {
  id: string
  email?: string | null
  username?: string | null
  full_name: string | null
  created_at: string | null
  updated_at?: string | null
  last_online_at?: string | null
}

interface UserBuild {
  id: string
  user_id?: string | null
  name: string
  total_price: number
  created_at: string
  is_public?: boolean | null
  profiles: { email?: string | null; full_name?: string | null } | null
}

interface UserFavorite {
  id: string
  user_id: string
  component_id: string
  created_at: string
  components: { name?: string | null; price?: number | null } | null
  profiles: { email?: string | null } | null
}

interface UserFilterItem {
  id: string
  label: string
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [builds, setBuilds] = useState<UserBuild[]>([])
  const [favorites, setFavorites] = useState<UserFavorite[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedBuildUserId, setSelectedBuildUserId] = useState<string>("all")
  const [selectedBuildVisibility, setSelectedBuildVisibility] = useState<"all" | "public" | "hidden">("all")
  const [selectedFavoriteUserId, setSelectedFavoriteUserId] = useState<string>("all")
  const [selectedCommunityUserId, setSelectedCommunityUserId] = useState<string>("all")
  const [selectedStatKey, setSelectedStatKey] = useState("components")
  const [statDetailsOpen, setStatDetailsOpen] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [buildSearch, setBuildSearch] = useState("")
  const [favoriteSearch, setFavoriteSearch] = useState("")
  const [communitySearch, setCommunitySearch] = useState("")

  useEffect(() => {
    const savedAdminAuth = sessionStorage.getItem("admin_auth")
    if (savedAdminAuth === "true") {
      setIsAuthorized(true)
      if (!sessionStorage.getItem("admin_metrics_password")) {
        sessionStorage.setItem("admin_metrics_password", ADMIN_PASSWORD)
      }
    }
    setAuthLoading(false)
  }, [])

  const handleAdminLogin = (event: React.FormEvent) => {
    event.preventDefault()
    const validEmail = adminEmail.trim().toLowerCase() === ADMIN_EMAIL
    const validPassword = adminPassword === ADMIN_PASSWORD

    if (validEmail && validPassword) {
      setIsAuthorized(true)
      setAuthError("")
      sessionStorage.setItem("admin_auth", "true")
      sessionStorage.setItem("admin_metrics_password", adminPassword)
      return
    }

    setAuthError("Грешен имейл или парола.")
  }

  useEffect(() => {
    if (!isAuthorized) return

    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
    })()

    async function fetchData() {
      setLoading(true)
      const supabase = createClient()
      const adminPw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("admin_metrics_password") || ADMIN_PASSWORD
          : null

      let favoritesFromApi: UserFavorite[] | null = null
      let buildsFromApi: UserBuild[] | null = null
      let usersFromApi: UserProfile[] | null = null
      if (adminPw) {
        try {
          const [favRes, buildRes, profRes] = await Promise.all([
            fetch("/api/admin/favorites-list", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPw }),
            }),
            fetch("/api/admin/builds-list", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPw }),
            }),
            fetch("/api/admin/profiles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPw }),
            }),
          ])
          const favPayload = await favRes.json()
          const buildPayload = await buildRes.json()
          const profPayload = await profRes.json()
          if (favPayload.configured && Array.isArray(favPayload.favorites)) {
            favoritesFromApi = favPayload.favorites.map((fav: Record<string, unknown>) => {
              const profileRaw = fav.profiles
              const componentRaw = fav.components
              return {
                ...fav,
                profiles:
                  Array.isArray(profileRaw) && profileRaw.length > 0
                    ? (profileRaw[0] as { email?: string | null })
                    : (profileRaw as { email?: string | null } | null),
                components:
                  Array.isArray(componentRaw) && componentRaw.length > 0
                    ? (componentRaw[0] as { name?: string | null; price?: number | null })
                    : (componentRaw as { name?: string | null; price?: number | null } | null),
              }
            }) as UserFavorite[]
          }
          if (buildPayload.configured && Array.isArray(buildPayload.builds)) {
            buildsFromApi = buildPayload.builds.map((build: Record<string, unknown>) => {
              const profileRaw = build.profiles
              return {
                ...build,
                user_id: (build.user_id as string | null | undefined) ?? null,
                name: String(build.name ?? "Untitled build"),
                is_public: Boolean(build.is_public),
                profiles:
                  Array.isArray(profileRaw) && profileRaw.length > 0
                    ? (profileRaw[0] as { email?: string | null; full_name?: string | null })
                    : (profileRaw as { email?: string | null; full_name?: string | null } | null),
              }
            }) as UserBuild[]
          }
          if (profPayload.configured && Array.isArray(profPayload.users)) {
            usersFromApi = profPayload.users as UserProfile[]
          }
        } catch {
          /* fall back to client query */
        }
      }

      try {
        const [
          { count: componentCount },
          { count: categoryCount },
          { count: brandCount },
          { count: userCount },
          inStockQuery,
          outOfStockQuery,
          { data: usersData },
          { data: allBuilds },
          { data: favoritesData },
          { count: favoritesCount },
        ] = await Promise.all([
          supabase.from("components").select("*", { count: "exact", head: true }),
          supabase.from("categories").select("*", { count: "exact", head: true }),
          supabase.from("brands").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("components").select("*", { count: "exact", head: true }).eq("in_stock", true),
          supabase.from("components").select("*", { count: "exact", head: true }).eq("in_stock", false),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("builds").select("id, user_id, name, total_price, created_at, is_public").order("created_at", { ascending: false }),
          supabase.from("favorites").select("id, user_id, component_id, created_at").order("created_at", { ascending: false }),
          supabase.from("favorites").select("*", { count: "exact", head: true }),
        ])

        const inStockCount = inStockQuery.count ?? 0
        const outOfStockCount = outOfStockQuery.count ?? 0
        const usersForLookup = (usersFromApi !== null ? usersFromApi : (usersData || [])) as UserProfile[]
        const userMap = new Map(
          usersForLookup.map((user) => [
            user.id,
            { email: user.email ?? null, full_name: user.full_name ?? null },
          ])
        )

        const normalizedBuilds = (allBuilds || []).map((build: Record<string, unknown>) => {
          const profile =
            typeof build.user_id === "string"
              ? userMap.get(build.user_id) ?? null
              : null
          return {
            ...build,
            user_id: (build.user_id as string | null | undefined) ?? null,
            name: String(build.name ?? "Untitled build"),
            is_public: Boolean(build.is_public),
            profiles: profile ?? null,
          }
        }) as UserBuild[]

        const componentIds = Array.from(
          new Set(
            (favoritesData || [])
              .map((fav: Record<string, unknown>) =>
                typeof fav.component_id === "string" ? fav.component_id : null
              )
              .filter(Boolean)
          )
        ) as string[]

        let componentMap = new Map<string, { name?: string | null; price?: number | null }>()
        if (componentIds.length > 0) {
          const { data: favoriteComponents } = await supabase
            .from("components")
            .select("id, name, price")
            .in("id", componentIds)
          componentMap = new Map(
            (favoriteComponents || []).map((component) => [
              component.id,
              { name: component.name, price: component.price },
            ])
          )
        }

        const normalizedFavorites = (favoritesData || []).map((fav: Record<string, unknown>) => {
          const profile =
            typeof fav.user_id === "string"
              ? userMap.get(fav.user_id)
              : null
          const component =
            typeof fav.component_id === "string"
              ? componentMap.get(fav.component_id) ?? null
              : null

          return {
            ...fav,
            profiles: profile ?? null,
            components: component ?? null,
          }
        }) as UserFavorite[]

        const mergedBuildsForStats =
          buildsFromApi !== null ? buildsFromApi : normalizedBuilds
        const publicBuildsCount = mergedBuildsForStats.filter((build) => build.is_public).length
        const hiddenBuildsCount = Math.max(mergedBuildsForStats.length - publicBuildsCount, 0)
        const communityCreatorsCount = new Set(
          mergedBuildsForStats
            .filter((build) => build.is_public && build.user_id)
            .map((build) => build.user_id)
        ).size
        const totalBuildPriceAll = mergedBuildsForStats.reduce(
          (sum, b) => sum + (b.total_price || 0),
          0
        )
        const avgAll = mergedBuildsForStats.length
          ? totalBuildPriceAll / mergedBuildsForStats.length
          : 0

        setStats({
          totalComponents: componentCount || 0,
          totalCategories: categoryCount || 0,
          totalBrands: brandCount || 0,
          totalUsers:
            usersFromApi !== null ? usersFromApi.length : userCount || 0,
          totalBuilds: mergedBuildsForStats.length,
          totalPublicBuilds: publicBuildsCount,
          totalHiddenBuilds: hiddenBuildsCount,
          totalCommunityCreators: communityCreatorsCount,
          avgBuildPrice: avgAll,
          componentsInStock: inStockCount,
          componentsOutOfStock: outOfStockCount,
          totalFavorites:
            favoritesFromApi !== null
              ? favoritesFromApi.length
              : normalizedFavorites.length || favoritesCount || 0,
        })

        setUsers(
          usersFromApi !== null ? usersFromApi : usersData || []
        )
        setBuilds(buildsFromApi !== null ? buildsFromApi : normalizedBuilds)
        setFavorites(
          favoritesFromApi !== null ? favoritesFromApi : normalizedFavorites
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthorized])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Няма данни"
    return new Date(dateStr).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserLabel = (userId?: string | null, profile?: { email?: string | null; full_name?: string | null } | null) => {
    const user = userId ? users.find((u) => u.id === userId) : undefined
    return (
      user?.full_name ||
      profile?.full_name ||
      user?.email ||
      profile?.email ||
      user?.username ||
      "Анонимен"
    )
  }

  const matchesSearch = (value: string, search: string) =>
    value.toLocaleLowerCase("bg").includes(search.trim().toLocaleLowerCase("bg"))

  const buildUsers = useMemo<UserFilterItem[]>(() => {
    const dedup = new Map<string, UserFilterItem>()
    for (const build of builds) {
      if (!build.user_id) continue
      dedup.set(build.user_id, {
        id: build.user_id,
        label: getUserLabel(build.user_id, build.profiles),
      })
    }
    return Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, "bg"))
  }, [builds, users])

  const publicBuilds = useMemo(
    () => builds.filter((build) => Boolean(build.is_public)),
    [builds]
  )

  const communityUsers = useMemo<UserFilterItem[]>(() => {
    const dedup = new Map<string, UserFilterItem>()
    for (const build of publicBuilds) {
      if (!build.user_id) continue
      dedup.set(build.user_id, {
        id: build.user_id,
        label: getUserLabel(build.user_id, build.profiles),
      })
    }
    return Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, "bg"))
  }, [publicBuilds, users])

  const favoriteUsers = useMemo<UserFilterItem[]>(() => {
    const dedup = new Map<string, UserFilterItem>()
    for (const fav of favorites) {
      if (!fav.user_id) continue
      dedup.set(fav.user_id, {
        id: fav.user_id,
        label: getUserLabel(fav.user_id, fav.profiles),
      })
    }
    return Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label, "bg"))
  }, [favorites, users])

  const buildCountsByUser = useMemo(() => {
    const counts = new Map<string, number>()
    for (const build of builds) {
      if (!build.user_id) continue
      counts.set(build.user_id, (counts.get(build.user_id) || 0) + 1)
    }
    return counts
  }, [builds])

  const favoriteCountsByUser = useMemo(() => {
    const counts = new Map<string, number>()
    for (const fav of favorites) {
      if (!fav.user_id) continue
      counts.set(fav.user_id, (counts.get(fav.user_id) || 0) + 1)
    }
    return counts
  }, [favorites])

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim()
    if (!query) return users

    return users.filter((user) => {
      const haystack = [
        user.full_name,
        user.email,
        user.username,
        user.id,
      ]
        .filter(Boolean)
        .join(" ")

      return matchesSearch(haystack, query)
    })
  }, [users, userSearch])

  const visibleBuilds = useMemo(
    () => {
      const query = buildSearch.trim()
      const filteredByUser =
        selectedBuildUserId === "all"
          ? builds
          : builds.filter((build) => build.user_id === selectedBuildUserId)

      const filteredByVisibility =
        selectedBuildVisibility === "all"
          ? filteredByUser
          : filteredByUser.filter((build) =>
              selectedBuildVisibility === "public" ? Boolean(build.is_public) : !build.is_public
            )

      if (!query) return filteredByVisibility

      return filteredByVisibility.filter((build) =>
        matchesSearch(
          [
            build.name,
            getUserLabel(build.user_id, build.profiles),
            build.id,
            build.is_public ? "public общност публична" : "hidden private скрита",
          ].join(" "),
          query
        )
      )
    },
    [builds, selectedBuildUserId, selectedBuildVisibility, buildSearch, users]
  )

  const visibleCommunityBuilds = useMemo(() => {
    const query = communitySearch.trim()
    const filteredByUser =
      selectedCommunityUserId === "all"
        ? publicBuilds
        : publicBuilds.filter((build) => build.user_id === selectedCommunityUserId)

    if (!query) return filteredByUser

    return filteredByUser.filter((build) =>
      matchesSearch(
        [build.name, getUserLabel(build.user_id, build.profiles), build.id].join(" "),
        query
      )
    )
  }, [publicBuilds, selectedCommunityUserId, communitySearch, users])

  const visibleFavorites = useMemo(
    () => {
      const query = favoriteSearch.trim()
      const filteredByUser =
        selectedFavoriteUserId === "all"
          ? favorites
          : favorites.filter((fav) => fav.user_id === selectedFavoriteUserId)

      if (!query) return filteredByUser

      return filteredByUser.filter((fav) =>
        matchesSearch(
          [
            fav.components?.name || "",
            getUserLabel(fav.user_id, fav.profiles),
            fav.id,
          ].join(" "),
          query
        )
      )
    },
    [favorites, selectedFavoriteUserId, favoriteSearch, users]
  )

  const openUserBuilds = (userId: string) => {
    setSelectedBuildUserId(userId)
    setSelectedBuildVisibility("all")
    setBuildSearch("")
    setActiveTab("builds")
  }

  const openUserFavorites = (userId: string) => {
    setSelectedFavoriteUserId(userId)
    setFavoriteSearch("")
    setActiveTab("favorites")
  }

  const stockAvailablePercent =
    ((stats?.componentsInStock || 0) / Math.max(stats?.totalComponents || 0, 1)) * 100
  const stockOutPercent =
    ((stats?.componentsOutOfStock || 0) / Math.max(stats?.totalComponents || 0, 1)) * 100

  const statCards = [
    {
      key: "components",
      title: "Компоненти",
      value: stats?.totalComponents || 0,
      icon: Package,
      desc: `${stats?.componentsInStock || 0} налични`,
      accent: "from-emerald-500/20 to-emerald-500/5",
      iconClass: "text-emerald-400",
      details: [
        `Общо компоненти в каталога: ${stats?.totalComponents || 0}`,
        `Налични продукти: ${stats?.componentsInStock || 0}`,
        `Изчерпани продукти: ${stats?.componentsOutOfStock || 0}`,
      ],
      actionLabel: "Управлявай компоненти",
      action: () => router.push("/admin/components"),
    },
    {
      key: "categories",
      title: "Категории",
      value: stats?.totalCategories || 0,
      icon: Boxes,
      desc: "Типове части",
      accent: "from-sky-500/20 to-sky-500/5",
      iconClass: "text-sky-400",
      details: [
        `Категории компоненти: ${stats?.totalCategories || 0}`,
        "Използват се за филтриране и групиране в каталога.",
        "Примери: процесори, видеокарти, RAM, дънни платки и други.",
      ],
      actionLabel: "Виж компонентите",
      action: () => router.push("/admin/components"),
    },
    {
      key: "brands",
      title: "Марки",
      value: stats?.totalBrands || 0,
      icon: Building2,
      desc: "Производители",
      accent: "from-violet-500/20 to-violet-500/5",
      iconClass: "text-violet-400",
      details: [
        `Регистрирани производители: ${stats?.totalBrands || 0}`,
        "Марки като Intel, AMD, NVIDIA, ASUS, MSI и други се ползват във филтрите.",
        "Колкото по-пълни са марките, толкова по-лесно клиентите намират продукти.",
      ],
      actionLabel: "Виж компонентите",
      action: () => router.push("/admin/components"),
    },
    {
      key: "users",
      title: "Клиенти",
      value: stats?.totalUsers || 0,
      icon: Users,
      desc: "Регистрирани",
      accent: "from-amber-500/20 to-amber-500/5",
      iconClass: "text-amber-400",
      details: [
        `Регистрирани клиенти: ${stats?.totalUsers || 0}`,
        `Клиенти със сглобки: ${buildUsers.length}`,
        `Клиенти с любими продукти: ${favoriteUsers.length}`,
      ],
      actionLabel: "Отвори клиенти",
      action: () => setActiveTab("users"),
    },
    {
      key: "builds",
      title: "Сглобки",
      value: stats?.totalBuilds || 0,
      icon: ShoppingCart,
      desc: "Конфигурации",
      accent: "from-primary/25 to-primary/5",
      iconClass: "text-primary",
      details: [
        `Общо създадени сглобки: ${stats?.totalBuilds || 0}`,
        `Публични сглобки: ${stats?.totalPublicBuilds || 0}`,
        `Скрити сглобки: ${stats?.totalHiddenBuilds || 0}`,
      ],
      actionLabel: "Отвори сглобки",
      action: () => {
        setSelectedBuildUserId("all")
        setSelectedBuildVisibility("all")
        setBuildSearch("")
        setActiveTab("builds")
      },
    },
    {
      key: "community",
      title: "Общност",
      value: stats?.totalPublicBuilds || 0,
      icon: Globe,
      desc: `${stats?.totalCommunityCreators || 0} автора`,
      accent: "from-teal-500/20 to-teal-500/5",
      iconClass: "text-teal-400",
      details: [
        `Публични сглобки в общността: ${stats?.totalPublicBuilds || 0}`,
        `Уникални автори: ${stats?.totalCommunityCreators || 0}`,
        "Тук се виждат само сглобките, които клиентите са направили публични.",
      ],
      actionLabel: "Отвори общност",
      action: () => {
        setSelectedCommunityUserId("all")
        setCommunitySearch("")
        setActiveTab("community")
      },
    },
    {
      key: "favorites",
      title: "Любими",
      value: stats?.totalFavorites || 0,
      icon: Heart,
      desc: "Запазени части",
      accent: "from-pink-500/20 to-pink-500/5",
      iconClass: "text-pink-400",
      details: [
        `Общо запазени любими продукти: ${stats?.totalFavorites || 0}`,
        `Клиенти с любими продукти: ${favoriteUsers.length}`,
        "Показва кои продукти клиентите следят или обмислят да купят.",
      ],
      actionLabel: "Отвори любими",
      action: () => {
        setSelectedFavoriteUserId("all")
        setFavoriteSearch("")
        setActiveTab("favorites")
      },
    },
    {
      key: "avg-price",
      title: "Ср. цена",
      value: formatPrice(stats?.avgBuildPrice || 0),
      icon: Euro,
      desc: "На сглобка",
      accent: "from-cyan-500/20 to-cyan-500/5",
      iconClass: "text-cyan-400",
      details: [
        `Средна цена на сглобка: ${formatPrice(stats?.avgBuildPrice || 0)}`,
        `Брой сглобки в изчислението: ${stats?.totalBuilds || 0}`,
        "Помага да се види средният бюджет, с който клиентите създават конфигурации.",
      ],
      actionLabel: "Виж сглобките",
      action: () => {
        setSelectedBuildUserId("all")
        setSelectedBuildVisibility("all")
        setBuildSearch("")
        setActiveTab("builds")
      },
    },
    {
      key: "out-of-stock",
      title: "Изчерпани",
      value: stats?.componentsOutOfStock || 0,
      icon: AlertCircle,
      desc: "Части",
      accent: "from-rose-500/20 to-rose-500/5",
      iconClass: "text-rose-400",
      details: [
        `Изчерпани компоненти: ${stats?.componentsOutOfStock || 0}`,
        `Налични компоненти: ${stats?.componentsInStock || 0}`,
        `Дял изчерпани: ${stockOutPercent.toFixed(1)}%`,
      ],
      actionLabel: "Управлявай компоненти",
      action: () => router.push("/admin/components"),
    },
  ]

  const selectedStat = statCards.find((stat) => stat.key === selectedStatKey) ?? statCards[0]

  const navigationItems = [
    {
      value: "dashboard",
      label: "Табло",
      description: "Общо състояние, метрики и наличности",
      icon: Activity,
      count: stats?.totalComponents || 0,
      countLabel: "части",
      iconClass: "text-primary",
      iconWrapClass: "bg-primary/12 ring-primary/20",
    },
    {
      value: "users",
      label: "Клиенти",
      description: "Профили, регистрации и активност",
      icon: Users,
      count: stats?.totalUsers || 0,
      countLabel: "потребители",
      iconClass: "text-amber-400",
      iconWrapClass: "bg-amber-500/12 ring-amber-500/20",
    },
    {
      value: "builds",
      label: "Сглобки",
      description: "Всички конфигурации и бързи филтри",
      icon: Layers,
      count: stats?.totalBuilds || 0,
      countLabel: "конфигурации",
      iconClass: "text-violet-400",
      iconWrapClass: "bg-violet-500/12 ring-violet-500/20",
    },
    {
      value: "community",
      label: "Общност",
      description: "Публични билдове и community автори",
      icon: Globe,
      count: stats?.totalPublicBuilds || 0,
      countLabel: "публични",
      iconClass: "text-teal-400",
      iconWrapClass: "bg-teal-500/12 ring-teal-500/20",
    },
    {
      value: "favorites",
      label: "Любими",
      description: "Запазени компоненти и потребителски интерес",
      icon: Heart,
      count: stats?.totalFavorites || 0,
      countLabel: "запазени",
      iconClass: "text-pink-400",
      iconWrapClass: "bg-pink-500/12 ring-pink-500/20",
    },
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="rounded-2xl border border-border/60 bg-card/70 px-6 py-4 shadow-lg backdrop-blur">
          <div className="animate-pulse text-muted-foreground">Проверка на достъп...</div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_28%)]" />
        <Card className="relative w-full max-w-md border-border/60 bg-card/85 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Защитен достъп
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Модерен админ панел</CardTitle>
              <CardDescription>
                Влез с админ имейл и парола, за да управляваш клиенти, сглобки и любими.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleAdminLogin}>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Имейл</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="kalinbk870@gmail.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Парола</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="1324"
                  required
                />
              </div>
              {authError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {authError}
                </p>
              ) : null}
              <Button type="submit" className="w-full h-11 rounded-xl">
                Вход в админ панела
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_20%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_24%)]" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20 shadow-sm">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-xl">Админ Панел</h1>
                <Badge variant="secondary" className="rounded-full">
                  PC Builder
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Анализи, клиенти, сглобки и любими на едно място
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border/70 bg-background/60"
            onClick={() => router.push("/")}
          >
            Към сайта
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 rounded-3xl border border-border/60 bg-card/60 backdrop-blur">
            <div className="animate-pulse text-muted-foreground">Зареждане...</div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <Card className="border-border/60 bg-card/70 shadow-lg backdrop-blur">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Нов по-модерен изглед
                    </div>
                    <h2 className="text-2xl font-semibold">Контролен център</h2>
                    <p className="text-sm text-muted-foreground">
                      Следи системата в реално време и превключвай бързо между клиенти,
                      сглобки, общност и любими.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:min-w-[420px] sm:grid-cols-4">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs text-muted-foreground">Клиенти</div>
                      <div className="mt-1 text-xl font-semibold">{stats?.totalUsers || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs text-muted-foreground">Сглобки</div>
                      <div className="mt-1 text-xl font-semibold">{stats?.totalBuilds || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs text-muted-foreground">Любими</div>
                      <div className="mt-1 text-xl font-semibold">{stats?.totalFavorites || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs text-muted-foreground">Публични</div>
                      <div className="mt-1 text-xl font-semibold">{stats?.totalPublicBuilds || 0}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <TabsList className="grid h-auto w-full grid-cols-1 gap-3 rounded-3xl border border-border/60 bg-card/70 p-3 shadow-lg md:grid-cols-2 xl:grid-cols-5">
              {navigationItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className={cn(
                    "h-auto min-h-[122px] w-full rounded-2xl border border-border/50 bg-background/65 px-4 py-4 text-left shadow-sm",
                    "!flex-col !items-start !justify-between gap-4 whitespace-normal transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background hover:shadow-md",
                    "data-[state=active]:border-primary/30 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/12 data-[state=active]:to-background data-[state=active]:shadow-lg"
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl ring-1", item.iconWrapClass)}>
                      <item.icon className={cn("h-5 w-5", item.iconClass)} />
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium"
                    >
                      {item.count} {item.countLabel}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-sm font-semibold text-foreground">{item.label}</div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {activeTab !== "dashboard" ? (
              <div className="sticky top-[81px] z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-sm backdrop-blur">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setActiveTab("dashboard")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Назад към таблото
                </Button>
                {activeTab !== "users" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => setActiveTab("users")}
                  >
                    Клиенти
                  </Button>
                ) : null}
              </div>
            ) : null}

            <TabsContent value="dashboard" className="space-y-6">
              <Card className="overflow-hidden border-border/60 bg-card/70 shadow-lg">
                <CardContent className="p-0">
                  <div className="grid gap-0 lg:grid-cols-[1.5fr_0.9fr]">
                    <div className="border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
                      <div className="mb-4 flex items-center gap-2 text-primary">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">Обобщение на системата</span>
                      </div>
                      <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        По-бърз и по-ясен поглед върху всичко важно в магазина.
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                        Виж броя клиенти, натоварването на сглобките, публичните community
                        конфигурации, активността в любими и състоянието на наличностите в един
                        по-модерен dashboard изглед.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-6">
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Средна цена</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {formatPrice(stats?.avgBuildPrice || 0)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Активни любими</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {stats?.totalFavorites || 0}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Публични сглобки</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {stats?.totalPublicBuilds || 0}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Автори в общност</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {stats?.totalCommunityCreators || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((stat) => (
                  <Card
                    key={stat.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedStatKey(stat.key)
                      setStatDetailsOpen(true)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedStatKey(stat.key)
                        setStatDetailsOpen(true)
                      }
                    }}
                    className={cn(
                      "cursor-pointer overflow-hidden border-border/60 bg-card/75 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring",
                      selectedStatKey === stat.key && "border-primary/50 shadow-lg ring-1 ring-primary/30"
                    )}
                  >
                    <CardContent className="p-0">
                      <div className={cn("border-b border-border/50 bg-gradient-to-br p-4", stat.accent)}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{stat.title}</span>
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/70 ring-1 ring-border/60">
                            <stat.icon className={cn("h-5 w-5", stat.iconClass)} />
                          </div>
                        </div>
                        <div className="mt-4 text-2xl font-semibold">{stat.value}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{stat.desc}</div>
                        <div className="mt-3 text-[11px] font-medium text-primary">
                          Кликни за подробности
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-border/60 bg-card/75 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                          <selectedStat.icon className={cn("h-5 w-5", selectedStat.iconClass)} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Подробности</p>
                          <h3 className="text-lg font-semibold">{selectedStat.title}</h3>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {selectedStat.details.map((detail) => (
                          <div
                            key={detail}
                            className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
                          >
                            {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={selectedStat.action}
                    >
                      {selectedStat.actionLabel}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Dialog open={statDetailsOpen} onOpenChange={setStatDetailsOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                      <selectedStat.icon className={cn("h-6 w-6", selectedStat.iconClass)} />
                    </div>
                    <DialogTitle>{selectedStat.title}</DialogTitle>
                    <DialogDescription>{selectedStat.desc}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {selectedStat.details.map((detail) => (
                      <div
                        key={detail}
                        className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
                      >
                        {detail}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    className="mt-2 w-full rounded-xl"
                    onClick={() => {
                      setStatDetailsOpen(false)
                      selectedStat.action()
                    }}
                  >
                    {selectedStat.actionLabel}
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </DialogContent>
              </Dialog>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-border/60 bg-card/75 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle>Наличност</CardTitle>
                    <CardDescription>Живо състояние на инвентара</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Налични</span>
                        <span className="font-medium text-emerald-400">{stats?.componentsInStock}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${stockAvailablePercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Изчерпани</span>
                        <span className="font-medium text-rose-400">{stats?.componentsOutOfStock}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all"
                          style={{ width: `${stockOutPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Всички части</div>
                        <div className="mt-1 text-xl font-semibold">{stats?.totalComponents || 0}</div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Налични</div>
                        <div className="mt-1 text-xl font-semibold text-emerald-400">
                          {stats?.componentsInStock || 0}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs text-muted-foreground">Изчерпани</div>
                        <div className="mt-1 text-xl font-semibold text-rose-400">
                          {stats?.componentsOutOfStock || 0}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/75 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle>Бърз обзор</CardTitle>
                    <CardDescription>Най-важното за днешната сесия</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-sm text-muted-foreground">Има регистрирани клиенти</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-lg font-semibold">{users.length}</span>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-sm text-muted-foreground">Създадени сглобки</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-lg font-semibold">{builds.length}</span>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-sm text-muted-foreground">Добавени любими</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-lg font-semibold">{favorites.length}</span>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-sm text-muted-foreground">В общността</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-lg font-semibold">{publicBuilds.length}</span>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card className="border-border/60 bg-card/75 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Регистрирани Клиенти ({users.length})
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Пълен списък на потребителите с регистрация и последно онлайн.
                      </CardDescription>
                    </div>
                    <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-primary">
                      Активен админ достъп
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Търси клиент по име, имейл или ID..."
                    className="h-11 rounded-xl border-border/60 bg-background/80"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      Показани <span className="font-medium text-foreground">{filteredUsers.length}</span> от{' '}
                      <span className="font-medium text-foreground">{users.length}</span> клиента
                    </span>
                    {userSearch.trim() ? (
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setUserSearch("")}>
                        Изчисти търсенето
                      </Button>
                    ) : null}
                  </div>
                  {filteredUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Няма регистрирани клиенти</p>
                  ) : (
                    <ScrollArea className="h-[560px] pr-2">
                      <div className="grid gap-3 lg:grid-cols-2">
                        {filteredUsers.map((user) => {
                          const userBuildCount = buildCountsByUser.get(user.id) || 0
                          const userFavoriteCount = favoriteCountsByUser.get(user.id) || 0

                          return (
                            <Card
                              key={user.id}
                              className="border-border/60 bg-background/70 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15 shrink-0">
                                      <Users className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                      <p className="font-medium truncate text-base">{user.full_name || "Без име"}</p>
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">{user.email || user.username || "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Badge variant="secondary" className="rounded-full text-xs">
                                      ID: {user.id.slice(0, 8)}...
                                    </Badge>
                                    <Badge className="rounded-full border-0 bg-emerald-500/10 text-emerald-400">
                                      Онлайн: {formatDate(user.last_online_at || user.updated_at)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                    <div className="mb-1 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Регистрация
                                    </div>
                                    <div className="font-medium text-foreground">{formatDate(user.created_at)}</div>
                                  </div>
                                  <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                    <div className="mb-1">Последно онлайн</div>
                                    <div className="font-medium text-foreground">
                                      {formatDate(user.last_online_at || user.updated_at)}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                  <Button
                                    type="button"
                                    variant={userBuildCount > 0 ? "default" : "outline"}
                                    className="h-auto min-h-11 justify-between rounded-xl px-3 py-2"
                                    onClick={() => openUserBuilds(user.id)}
                                    disabled={userBuildCount === 0}
                                  >
                                    <span className="flex items-center gap-2">
                                      <Layers className="h-4 w-4" />
                                      Сглобки
                                    </span>
                                    <Badge variant="secondary" className="rounded-full">
                                      {userBuildCount}
                                    </Badge>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={userFavoriteCount > 0 ? "default" : "outline"}
                                    className="h-auto min-h-11 justify-between rounded-xl px-3 py-2"
                                    onClick={() => openUserFavorites(user.id)}
                                    disabled={userFavoriteCount === 0}
                                  >
                                    <span className="flex items-center gap-2">
                                      <Heart className="h-4 w-4" />
                                      Любими
                                    </span>
                                    <Badge variant="secondary" className="rounded-full">
                                      {userFavoriteCount}
                                    </Badge>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="builds" className="space-y-4">
              <Card className="border-border/60 bg-card/75 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Сглобки ({visibleBuilds.length})
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Всички конфигурации, групирани по потребител и видимост.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {buildUsers.length} клиента със сглобки
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={buildSearch}
                    onChange={(e) => setBuildSearch(e.target.value)}
                    placeholder="Търси сглобка по име, клиент или ID..."
                    className="h-11 rounded-xl border-border/60 bg-background/80"
                  />
                  {buildUsers.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={selectedBuildVisibility === "all" ? "default" : "outline"}
                          className={cn("rounded-full", selectedBuildVisibility === "all" && "shadow-sm")}
                          onClick={() => setSelectedBuildVisibility("all")}
                        >
                          Всички видимости
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedBuildVisibility === "public" ? "default" : "outline"}
                          className={cn("rounded-full", selectedBuildVisibility === "public" && "shadow-sm")}
                          onClick={() => setSelectedBuildVisibility("public")}
                        >
                          Публични
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedBuildVisibility === "hidden" ? "default" : "outline"}
                          className={cn("rounded-full", selectedBuildVisibility === "hidden" && "shadow-sm")}
                          onClick={() => setSelectedBuildVisibility("hidden")}
                        >
                          Скрити
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedBuildUserId === "all" ? "default" : "outline"}
                        className={cn("rounded-full", selectedBuildUserId === "all" && "shadow-sm")}
                        onClick={() => setSelectedBuildUserId("all")}
                      >
                        Всички
                      </Button>
                      {buildUsers.map((user) => (
                        <Button
                          key={user.id}
                          size="sm"
                          variant={selectedBuildUserId === user.id ? "default" : "outline"}
                          className={cn("rounded-full", selectedBuildUserId === user.id && "shadow-sm")}
                          onClick={() => setSelectedBuildUserId(user.id)}
                        >
                          {user.label}
                        </Button>
                      ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      Показани <span className="font-medium text-foreground">{visibleBuilds.length}</span> от{' '}
                      <span className="font-medium text-foreground">{builds.length}</span> сглобки
                    </span>
                    {(buildSearch.trim() || selectedBuildUserId !== "all" || selectedBuildVisibility !== "all") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setBuildSearch("")
                          setSelectedBuildUserId("all")
                          setSelectedBuildVisibility("all")
                        }}
                      >
                        Изчисти филтрите
                      </Button>
                    ) : null}
                  </div>
                  {visibleBuilds.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Няма създадени сглобки</p>
                  ) : (
                    <ScrollArea className="h-[560px] pr-2">
                      <div className="grid gap-3 lg:grid-cols-2">
                        {visibleBuilds.map((build) => (
                          <Card
                            key={build.id}
                            className="border-border/60 bg-background/70 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate text-base">{build.name}</p>
                                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">
                                          {getUserLabel(build.user_id, build.profiles)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      <Badge
                                        className={cn(
                                          "rounded-full border-0",
                                          build.is_public
                                            ? "bg-teal-500/10 text-teal-400"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {build.is_public ? "Публична" : "Скрита"}
                                      </Badge>
                                      <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                                        {formatPrice(build.total_price || 0)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(build.created_at)}
                                  </span>
                                  <span>ID: {build.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-4">
              <Card className="border-border/60 bg-card/75 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Общност ({visibleCommunityBuilds.length})
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Следи кои сглобки са публикувани публично и кои клиенти участват в общността.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {stats?.totalPublicBuilds || 0} публични
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {stats?.totalCommunityCreators || 0} автора
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-xs text-muted-foreground">Публични сглобки</div>
                      <div className="mt-1 text-2xl font-semibold">{stats?.totalPublicBuilds || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-xs text-muted-foreground">Скрити сглобки</div>
                      <div className="mt-1 text-2xl font-semibold">{stats?.totalHiddenBuilds || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="text-xs text-muted-foreground">Автори</div>
                      <div className="mt-1 text-2xl font-semibold">{stats?.totalCommunityCreators || 0}</div>
                    </div>
                  </div>

                  <Input
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    placeholder="Търси публична сглобка по име, клиент или ID..."
                    className="h-11 rounded-xl border-border/60 bg-background/80"
                  />

                  {communityUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedCommunityUserId === "all" ? "default" : "outline"}
                        className={cn("rounded-full", selectedCommunityUserId === "all" && "shadow-sm")}
                        onClick={() => setSelectedCommunityUserId("all")}
                      >
                        Всички автори
                      </Button>
                      {communityUsers.map((user) => (
                        <Button
                          key={user.id}
                          size="sm"
                          variant={selectedCommunityUserId === user.id ? "default" : "outline"}
                          className={cn("rounded-full", selectedCommunityUserId === user.id && "shadow-sm")}
                          onClick={() => setSelectedCommunityUserId(user.id)}
                        >
                          {user.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      Показани <span className="font-medium text-foreground">{visibleCommunityBuilds.length}</span> от{' '}
                      <span className="font-medium text-foreground">{publicBuilds.length}</span> публични сглобки
                    </span>
                    {(communitySearch.trim() || selectedCommunityUserId !== "all") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setCommunitySearch("")
                          setSelectedCommunityUserId("all")
                        }}
                      >
                        Изчисти филтрите
                      </Button>
                    ) : null}
                  </div>

                  {visibleCommunityBuilds.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Все още няма публични сглобки в общността.
                    </p>
                  ) : (
                    <ScrollArea className="h-[560px] pr-2">
                      <div className="grid gap-3 lg:grid-cols-2">
                        {visibleCommunityBuilds.map((build) => (
                          <Card
                            key={build.id}
                            className="border-border/60 bg-background/70 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate text-base">{build.name}</p>
                                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                      <Mail className="h-3.5 w-3.5" />
                                      <span className="truncate">
                                        {getUserLabel(build.user_id, build.profiles)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="rounded-full border-0 bg-teal-500/10 text-teal-400">
                                      В общността
                                    </Badge>
                                    <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                                      {formatPrice(build.total_price || 0)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(build.created_at)}
                                  </span>
                                  <span>ID: {build.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="favorites" className="space-y-4">
              <Card className="border-border/60 bg-card/75 shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-primary" />
                        Любими Части ({visibleFavorites.length})
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Запазените продукти на клиентите с бърз филтър по потребител.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {favoriteUsers.length} клиента с любими
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={favoriteSearch}
                    onChange={(e) => setFavoriteSearch(e.target.value)}
                    placeholder="Търси любими по продукт, клиент или ID..."
                    className="h-11 rounded-xl border-border/60 bg-background/80"
                  />
                  {favoriteUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedFavoriteUserId === "all" ? "default" : "outline"}
                        className={cn("rounded-full", selectedFavoriteUserId === "all" && "shadow-sm")}
                        onClick={() => setSelectedFavoriteUserId("all")}
                      >
                        Всички
                      </Button>
                      {favoriteUsers.map((user) => (
                        <Button
                          key={user.id}
                          size="sm"
                          variant={selectedFavoriteUserId === user.id ? "default" : "outline"}
                          className={cn("rounded-full", selectedFavoriteUserId === user.id && "shadow-sm")}
                          onClick={() => setSelectedFavoriteUserId(user.id)}
                        >
                          {user.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      Показани <span className="font-medium text-foreground">{visibleFavorites.length}</span> от{' '}
                      <span className="font-medium text-foreground">{favorites.length}</span> любими
                    </span>
                    {(favoriteSearch.trim() || selectedFavoriteUserId !== "all") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => {
                          setFavoriteSearch("")
                          setSelectedFavoriteUserId("all")
                        }}
                      >
                        Изчисти филтрите
                      </Button>
                    ) : null}
                  </div>
                  {visibleFavorites.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Няма любими части в базата или липсва service role ключ за
                      четене през админ панела.
                    </p>
                  ) : (
                    <ScrollArea className="h-[560px] pr-2">
                      <div className="grid gap-3 lg:grid-cols-2">
                        {visibleFavorites.map((fav) => (
                          <Card
                            key={fav.id}
                            className="border-border/60 bg-background/70 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate text-base">
                                      {fav.components?.name || "Непознат компонент"}
                                    </p>
                                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                      <Mail className="h-3.5 w-3.5" />
                                      <span className="truncate">
                                        {getUserLabel(fav.user_id, fav.profiles)}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="rounded-full">
                                    {formatPrice(fav.components?.price || 0)}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(fav.created_at)}
                                  </span>
                                  <span>ID: {fav.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
