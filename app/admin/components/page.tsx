"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Component, Category, Brand } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star,
  Package,
  Check,
  X
} from "lucide-react"

export default function AdminComponentsPage() {
  const [components, setComponents] = useState<Component[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [editingComponent, setEditingComponent] = useState<Component | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // New component form state
  const [newComponent, setNewComponent] = useState({
    name: "",
    slug: "",
    model: "",
    description: "",
    price: 0,
    category_id: "",
    brand_id: "",
    in_stock: true,
    specs: "{}"
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [{ data: comps }, { data: cats }, { data: brs }] = await Promise.all([
        supabase.from("components").select("*").order("name"),
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("brands").select("*").order("name"),
      ])

      setComponents(comps || [])
      setCategories(cats || [])
      setBrands(brs || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredComponents = components.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.model?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || c.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "Unknown"
  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || "Unknown"

  const handleAddComponent = async () => {
    const supabase = createClient()
    
    let parsedSpecs = {}
    try {
      parsedSpecs = JSON.parse(newComponent.specs)
    } catch {
      alert("Invalid JSON in specs field")
      return
    }

    const { data, error } = await supabase
      .from("components")
      .insert({
        ...newComponent,
        specs: parsedSpecs,
        slug: newComponent.slug || newComponent.name.toLowerCase().replace(/\s+/g, "-"),
      })
      .select()
      .single()

    if (!error && data) {
      setComponents(prev => [...prev, data])
      setIsAddDialogOpen(false)
      setNewComponent({
        name: "",
        slug: "",
        model: "",
        description: "",
        price: 0,
        category_id: "",
        brand_id: "",
        in_stock: true,
        specs: "{}"
      })
    }
  }

  const handleUpdateComponent = async () => {
    if (!editingComponent) return

    const supabase = createClient()
    
    const { error } = await supabase
      .from("components")
      .update({
        name: editingComponent.name,
        model: editingComponent.model,
        description: editingComponent.description,
        price: editingComponent.price,
        in_stock: editingComponent.in_stock,
      })
      .eq("id", editingComponent.id)

    if (!error) {
      setComponents(prev => 
        prev.map(c => c.id === editingComponent.id ? editingComponent : c)
      )
      setEditingComponent(null)
    }
  }

  const handleDeleteComponent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this component?")) return

    const supabase = createClient()
    await supabase.from("components").delete().eq("id", id)
    setComponents(prev => prev.filter(c => c.id !== id))
  }

  const handleToggleStock = async (component: Component) => {
    const supabase = createClient()
    const newStockStatus = !component.in_stock

    await supabase
      .from("components")
      .update({ in_stock: newStockStatus })
      .eq("id", component.id)

    setComponents(prev =>
      prev.map(c => c.id === component.id ? { ...c, in_stock: newStockStatus } : c)
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-muted-foreground">Loading components...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Components</h1>
          <p className="text-muted-foreground mt-1">
            Manage your PC component inventory
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Component</DialogTitle>
              <DialogDescription>
                Add a new PC component to the catalog.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newComponent.name}
                    onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                    placeholder="Intel Core i9-14900K"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={newComponent.model}
                    onChange={(e) => setNewComponent({ ...newComponent, model: e.target.value })}
                    placeholder="i9-14900K"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newComponent.category_id}
                    onValueChange={(value) => setNewComponent({ ...newComponent, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Select
                    value={newComponent.brand_id}
                    onValueChange={(value) => setNewComponent({ ...newComponent, brand_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newComponent.price}
                  onChange={(e) => setNewComponent({ ...newComponent, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newComponent.description}
                  onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
                  placeholder="Product description..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specs">Specifications (JSON)</Label>
                <Textarea
                  id="specs"
                  value={newComponent.specs}
                  onChange={(e) => setNewComponent({ ...newComponent, specs: e.target.value })}
                  placeholder='{"cores": 24, "threads": 32, "socket": "LGA1700"}'
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="in_stock">In Stock</Label>
                <Switch
                  id="in_stock"
                  checked={newComponent.in_stock}
                  onCheckedChange={(checked) => setNewComponent({ ...newComponent, in_stock: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddComponent}>Add Component</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Components Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Components ({filteredComponents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComponents.map((component) => (
                  <TableRow key={component.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium">{component.name}</p>
                        {component.model && (
                          <p className="text-sm text-muted-foreground">{component.model}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(component.category_id)}</Badge>
                    </TableCell>
                    <TableCell>{getBrandName(component.brand_id)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${component.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span>{component.rating?.toFixed(1) || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStock(component)}
                        className={component.in_stock ? "text-green-500" : "text-red-500"}
                      >
                        {component.in_stock ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingComponent(component)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Component</DialogTitle>
                            </DialogHeader>
                            {editingComponent && (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Name</Label>
                                  <Input
                                    value={editingComponent.name}
                                    onChange={(e) => setEditingComponent({
                                      ...editingComponent,
                                      name: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Price</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingComponent.price}
                                    onChange={(e) => setEditingComponent({
                                      ...editingComponent,
                                      price: parseFloat(e.target.value) || 0
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editingComponent.description || ""}
                                    onChange={(e) => setEditingComponent({
                                      ...editingComponent,
                                      description: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label>In Stock</Label>
                                  <Switch
                                    checked={editingComponent.in_stock}
                                    onCheckedChange={(checked) => setEditingComponent({
                                      ...editingComponent,
                                      in_stock: checked
                                    })}
                                  />
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingComponent(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateComponent}>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteComponent(component.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
