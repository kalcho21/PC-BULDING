"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Build, Component, Category } from "@/lib/types"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Edit, Eye, Share2, Lock, Globe, Cpu, Gauge, Download, GitCompare } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface BuildWithItems extends Build {
  build_items: {
    id: string
    component: Component
    quantity: number
  }[]
}

export default function BuildsPage() {
  const router = useRouter()
  const [builds, setBuilds] = useState<BuildWithItems[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [editingBuild, setEditingBuild] = useState<Build | null>(null)
  const [newBuildName, setNewBuildName] = useState("")
  const [newBuildDescription, setNewBuildDescription] = useState("")
  const [newBuildPublic, setNewBuildPublic] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchSeqRef = useRef(0)
  const [selectedBuildIds, setSelectedBuildIds] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    const fetchSeq = ++fetchSeqRef.current
    const supabase = createClient()
    setFetchError(null)
    setLoading(true)
    setBuilds([])

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (fetchSeq !== fetchSeqRef.current) return
    setUser(user)

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("display_order")
    if (fetchSeq !== fetchSeqRef.current) return
    setCategories(cats || [])

    if (!user) {
      setBuilds([])
      setLoading(false)
      return
    }

    const { data: buildsData, error: buildsErr } = await supabase
      .from("builds")
      .select(`
          *,
          build_items (
            id,
            quantity,
            component:components (
              *,
              category:categories (*),
              brand:brands (*)
            )
          )
        `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (fetchSeq !== fetchSeqRef.current) return

    if (buildsErr) {
      console.error(buildsErr)
      setFetchError(buildsErr.message)
      setBuilds([])
    } else {
      const normalized = (buildsData || []).map((b: Build & { title?: string }) => ({
        ...b,
        name: b.name ?? (b as { title?: string }).title ?? "Сглобка",
      }))
      setBuilds(normalized as BuildWithItems[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchData()
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void fetchData()
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [fetchData])

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Unknown"
  }

  const handleCreateBuild = async () => {
    if (!user || !newBuildName.trim()) return
    
    setIsCreating(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("builds")
      .insert({
        user_id: user.id,
        name: newBuildName.trim(),
        description: newBuildDescription.trim() || null,
        is_public: newBuildPublic,
      })
      .select()
      .single()

    if (!error && data) {
      router.push("/builds")
      router.refresh()
    }

    setIsCreating(false)
    setNewBuildName("")
    setNewBuildDescription("")
    setNewBuildPublic(false)
  }

  const handleDeleteBuild = async (buildId: string) => {
    const supabase = createClient()
    await supabase.from("builds").delete().eq("id", buildId)
    setBuilds(prev => prev.filter(b => b.id !== buildId))
  }

  const handleUpdateBuild = async () => {
    if (!editingBuild) return

    const supabase = createClient()
    await supabase
      .from("builds")
      .update({
        name: editingBuild.name,
        description: editingBuild.description,
        is_public: editingBuild.is_public,
      })
      .eq("id", editingBuild.id)

    setBuilds(prev => 
      prev.map(b => b.id === editingBuild.id ? { ...b, ...editingBuild } : b)
    )
    setEditingBuild(null)
  }

  const handleShareBuild = async (buildId: string) => {
    const shareUrl = `${window.location.origin}/builder?build=${buildId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Линкът към публичната сглобка е копиран.")
    } catch {
      toast.error("Неуспешно копиране на линка.")
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price || 0)

  const toggleBuildForCompare = (buildId: string) => {
    setSelectedBuildIds((prev) => {
      if (prev.includes(buildId)) {
        return prev.filter((id) => id !== buildId)
      }
      if (prev.length >= 3) {
        toast.error("Можеш да сравниш до 3 сглобки.")
        return prev
      }
      return [...prev, buildId]
    })
  }

  const exportBuild = (build: BuildWithItems) => {
    const lines = [
      `Име: ${build.name}`,
      `Описание: ${build.description || "Няма"}`,
      `Видимост: ${build.is_public ? "Публична" : "Скрита"}`,
      `Обща цена: ${formatPrice(build.total_price || 0)}`,
      `Оценка: ${build.performance_score || 0}`,
      "",
      ...build.build_items.map(
        (item) =>
          `${item.component.category?.name || getCategoryName(item.component.category_id)}: ${item.component.name} x${item.quantity}`
      ),
    ].join("\n")

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${build.name.replace(/\s+/g, "-").toLowerCase() || "build"}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success("Сглобката е експортирана.")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading your builds...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Sign in to View Your Builds</h1>
            <p className="text-muted-foreground mb-8">
              Create an account or sign in to save and manage your PC builds.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button>Sign In</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button variant="outline">Create Account</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {fetchError && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Грешка при зареждане на сглобките: {fetchError}. Провери дали таблицата{" "}
            <code className="text-xs">build_items</code> съществува и дали RLS политиките
            позволяват достъп.
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Моите сглобки</h1>
            <p className="text-muted-foreground mt-1">
              Управлявай и сравнявай запазените си конфигурации
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedBuildIds.length >= 2 ? (
              <Link href={`/build-compare?ids=${selectedBuildIds.join(",")}`}>
                <Button variant="outline">
                  <GitCompare className="w-4 h-4 mr-2" />
                  Сравни избраните ({selectedBuildIds.length})
                </Button>
              </Link>
            ) : null}
            <Link href="/community">
              <Button variant="outline">
                <Globe className="w-4 h-4 mr-2" />
                Общностни сглобки
              </Button>
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Нова сглобка
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Нова сглобка</DialogTitle>
                  <DialogDescription>
                    Дай име на конфигурацията и започни да добавяш части.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Име</Label>
                    <Input
                      id="name"
                      placeholder="Gaming Beast 2025"
                      value={newBuildName}
                      onChange={(e) => setNewBuildName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Описание (по желание)</Label>
                    <Textarea
                      id="description"
                      placeholder="High-end gaming PC for 4K gaming..."
                      value={newBuildDescription}
                      onChange={(e) => setNewBuildDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Публична сглобка</Label>
                      <p className="text-sm text-muted-foreground">
                        Позволи на други хора да я виждат
                      </p>
                    </div>
                    <Switch
                      checked={newBuildPublic}
                      onCheckedChange={setNewBuildPublic}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreateBuild} 
                    disabled={!newBuildName.trim() || isCreating}
                  >
                    {isCreating ? "Създаване..." : "Създай"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {builds.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Cpu className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Все още нямаш сглобки</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Създай първата си конфигурация и после ще можеш да я сравняваш и експортираш.
              </p>
              <Link href="/">
                <Button variant="outline">
                  Към конфигуратора
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {builds.map((build) => (
              <Card key={build.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {build.name}
                        {build.is_public ? (
                          <Globe className="w-4 h-4 text-green-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      {build.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {build.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant={selectedBuildIds.includes(build.id) ? "default" : "outline"}
                      size="sm"
                      className="ml-3"
                      onClick={() => toggleBuildForCompare(build.id)}
                    >
                      <GitCompare className="w-4 h-4 mr-2" />
                      {selectedBuildIds.includes(build.id) ? "Избрана" : "Сравни"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Components preview */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {build.build_items.slice(0, 5).map((item) => (
                      <Badge 
                        key={item.id} 
                        variant="secondary"
                        className="text-xs"
                      >
                        {getCategoryName(item.component.category_id)}
                      </Badge>
                    ))}
                    {build.build_items.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{build.build_items.length - 5} more
                      </Badge>
                    )}
                    {build.build_items.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        No components added yet
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold text-primary">
                        {formatPrice(build.total_price || 0)}
                      </span>
                    </div>
                    {build.performance_score > 0 && (
                      <div className="flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{build.performance_score}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/builder?build=${build.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Отвори
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => exportBuild(build)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    {build.is_public && (
                      <Button variant="outline" size="sm" onClick={() => handleShareBuild(build.id)}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingBuild(build)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Настройки на сглобката</DialogTitle>
                        </DialogHeader>
                        {editingBuild && (
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Име</Label>
                              <Input
                                id="edit-name"
                                value={editingBuild.name}
                                onChange={(e) => setEditingBuild({
                                  ...editingBuild,
                                  name: e.target.value
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-description">Описание</Label>
                              <Textarea
                                id="edit-description"
                                value={editingBuild.description || ""}
                                onChange={(e) => setEditingBuild({
                                  ...editingBuild,
                                  description: e.target.value
                                })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Публична</Label>
                              <Switch
                                checked={editingBuild.is_public}
                                onCheckedChange={(checked) => setEditingBuild({
                                  ...editingBuild,
                                  is_public: checked
                                })}
                              />
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingBuild(null)}>
                            Отказ
                          </Button>
                          <Button onClick={handleUpdateBuild}>
                            Запази
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteBuild(build.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
