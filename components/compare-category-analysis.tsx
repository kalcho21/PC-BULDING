'use client'

import type { Component } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  categorySlug: string
  components: Component[]
  formatPrice: (price: number) => string
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Да' : 'Не'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function chipsetTier(chipset: string): 'high' | 'mid' | 'entry' {
  const c = chipset.toUpperCase()
  if (c.includes('X870') || c.includes('X670') || c.includes('Z890') || c.includes('Z790')) return 'high'
  if (c.includes('B850') || c.includes('B650') || c.includes('B840') || c.includes('B760')) return 'mid'
  return 'entry'
}

/** Опростена тежест за заключение */
function scoreMotherboard(c: Component): number {
  const s = c.specs || {}
  let sc = 0
  sc += safeNum(s.m2_slots) * 8
  sc += safeNum(s.pcie_slots) * 5
  sc += safeNum(s.memory_slots) * 4
  sc += safeNum(s.max_memory) / 1024
  sc += s.wifi ? 6 : 0
  sc += chipsetTier(String(s.chipset || '')) === 'high' ? 25 : chipsetTier(String(s.chipset || '')) === 'mid' ? 15 : 5
  if (String(s.memory_type || '').includes('DDR5')) sc += 12
  sc += (c.rating || 0) * 2
  sc -= c.price / 120
  return sc
}

function scoreCooling(c: Component): number {
  const s = c.specs || {}
  let sc = safeNum(s.tdp_rating) / 2 + safeNum(s.fan_count) * 6
  const rad = safeNum(s.radiator_size)
  if (rad >= 360) sc += 25
  else if (rad >= 280) sc += 18
  else if (rad >= 240) sc += 12
  else if (rad > 0) sc += 6
  const h = safeNum(s.height)
  if (h > 0 && h <= 165) sc += 6
  sc += safeNum(s.noise_level) > 0 ? Math.max(0, 35 - safeNum(s.noise_level) / 10) : 10
  const t = String(s.type || '').toLowerCase()
  if (t.includes('водно') || t.includes('aio') || t.includes('liquid')) sc += 15
  sc += (Array.isArray(s.socket_support) ? s.socket_support.length : 0) * 3
  sc -= c.price / 100
  return sc
}

function scoreCase(c: Component): number {
  const s = c.specs || {}
  let sc = safeNum(s.fan_slots) * 5 + safeNum(s.included_fans) * 8
  sc += safeNum(s.radiator_support) >= 360 ? 20 : safeNum(s.radiator_support) >= 280 ? 14 : 8
  sc += safeNum(s.max_gpu_length) / 25
  sc += safeNum(s.max_cpu_cooler_height) / 8
  const sup = Array.isArray(s.motherboard_support) ? s.motherboard_support.length : 0
  sc += sup * 4
  const side = String(s.side_panel || '').toLowerCase()
  if (side.includes('mesh') || side.includes('мреж')) sc += 18
  if (side.includes('glass') || side.includes('стъкл')) sc += 6
  sc -= c.price / 80
  return sc
}

function scoreStorage(c: Component): number {
  const s = c.specs || {}
  let sc = safeNum(s.read_speed) / 80 + safeNum(s.write_speed) / 90
  sc += safeNum(s.capacity) * 1.2
  sc += safeNum(s.tbw) / 200
  const iface = String(s.interface || s.type || '').toLowerCase()
  if (iface.includes('nvme') || iface.includes('pcie')) sc += 25
  if (s.dram) sc += 10
  if (safeNum(s.rpm) > 0) sc -= 5
  const price = c.price || 1
  const cap = safeNum(s.capacity) || 1
  sc += (cap * 1000) / price * 3
  return sc
}

function scorePsu(c: Component): number {
  const s = c.specs || {}
  let sc = safeNum(s.wattage) / 25
  const eff = String(s.efficiency || '').toLowerCase()
  if (eff.includes('titanium')) sc += 28
  else if (eff.includes('platinum')) sc += 22
  else if (eff.includes('gold')) sc += 16
  else if (eff.includes('silver')) sc += 10
  else if (eff.includes('bronze')) sc += 6
  const mod = String(s.modular || '').toLowerCase()
  if (mod.includes('full')) sc += 14
  else if (mod.includes('semi')) sc += 8
  sc += safeNum(s.pc_ie_connectors || s.pcie_connectors) * 4
  sc += safeNum(s.warranty_years) * 5
  const atx = String(s.atx_version || '').toLowerCase()
  if (atx.includes('3')) sc += 12
  sc += (c.rating || 0) * 2
  sc -= c.price / 50
  return sc
}

function safeNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function ConclusionBlock({
  components,
  scores,
  formatPrice,
}: {
  components: Component[]
  scores: number[]
  formatPrice: (n: number) => string
}) {
  const order = components
    .map((c, i) => ({ c, s: scores[i] }))
    .sort((a, b) => b.s - a.s)
  const winner = order[0]?.c
  const second = order[1]?.c ?? null
  if (!winner) return null
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" />
          Заключение
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <p>
          <strong className="text-foreground">{winner.name}</strong> натрупва най-добър баланс по наличните в
          каталога полета и оценка за цена/функции спрямо останалите в сравнението.
        </p>
        {second && second.id !== winner.id && (
          <p className="text-muted-foreground">
            <strong>{second.name}</strong> е алтернатива на цена {formatPrice(second.price)} — прегледай конкретните
            редове по-горе дали отговоря на твоя сокет, кутия или кабелен мениджмънт.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Анализът е ориентировъчен: липсващи полета в базата ограничават детайла (VRM фази, ревюта, шумови тестове и
          т.н.). При покупка потвърди с официални спецификации на производителя.
        </p>
      </CardContent>
    </Card>
  )
}

function MotherboardAnalysis({ components, formatPrice }: Omit<Props, 'categorySlug'>) {
  const scores = components.map(scoreMotherboard)
  const winnerIdx = scores.indexOf(Math.max(...scores))

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Какво сравняваме при дънни платки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Тук <strong className="text-foreground">не</strong> показваме измислени проценти за „реално представяне“,
            „стабилност при VRM“, „бъдещ ъпгрейд“ или „типични проблеми“ — в каталога обикновено няма такива обективни
            полета за всяко дъно.
          </p>
          <p>
            Вместо това разчитаме на <strong className="text-foreground">сокет, чипсет, слотове RAM/M.2/PCIe, мрежови
            функции и цена</strong>, плюс кратък текст за гейминг / овърклок / бюджет, базиран на наличните данни.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Сравнение по ключови данни</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Критерий</th>
                {components.map((c) => (
                  <th key={c.id} className="p-2 min-w-[140px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['socket', 'Сокет'],
                  ['chipset', 'Чипсет'],
                  ['form_factor', 'Форм фактор'],
                  ['memory_type', 'Тип памет (DDR4/DDR5)'],
                  ['memory_slots', 'Слотове RAM'],
                  ['max_memory', 'Макс. RAM (GB)'],
                  ['m2_slots', 'M.2 слотове'],
                  ['pcie_slots', 'PCIe слотове'],
                  ['usb_ports', 'USB (бр. апрокс.)'],
                  ['wifi', 'Wi‑Fi'],
                  ['bluetooth', 'Bluetooth'],
                  ['price', 'Цена'],
                ] as const
              ).map(([key, label]) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {components.map((c, i) => (
                    <td
                      key={c.id}
                      className={cn('p-2', i === winnerIdx && 'bg-primary/10 font-medium')}
                    >
                      {key === 'price' ? formatPrice(c.price) : fmt((c.specs as Record<string, unknown>)[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Анализ: употреба в реалния свят</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {components.map((c) => {
            const s = c.specs || {}
            const tier = chipsetTier(String(s.chipset || ''))
            const ddr5 = String(s.memory_type || '').includes('DDR5')
            const gameText =
              tier === 'high'
                ? 'Подходящо за гейминг с висок клас CPU/GPU — повече ленти PCIe и обикновено по-добър VRM клас (според сегмента на чипсета).'
                : tier === 'mid'
                  ? 'Добър избор за типичен гейминг билд (среден клас CPU, една силна видеокарта).'
                  : 'Подходящо за бюджетен или офис гейминг билд — ограничения по разширения и RAM често са по-осезаеми.'
            const ocText =
              tier === 'high'
                ? 'По-подходящо за овърклок на поддържани K/X CPU (според модела дъно — провери reviews).'
                : 'За агресивен овърклок често се предпочитат по-високи линии чипсет + по-добро охлаждане на VRM — данните тук са ориентир.'
            const futText = ddr5
              ? 'DDR5 е в посока „future-proof“ за нови платформи; провери дали имаш достатъчно M.2 за NVMe.'
              : 'DDR4 платформата е зряла и икономична; ъпгрейдът накрая често е цял комплект дъно+RAM+CPU.'
            return (
              <div key={c.id} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <p className="font-medium flex items-center gap-2">
                  {c.name}
                  {scores[components.indexOf(c)] === Math.max(...scores) && (
                    <Badge className="gap-1 bg-amber-500/90">
                      <Crown className="h-3 w-3" /> Топ по сума от критерии
                    </Badge>
                  )}
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    <strong className="text-foreground">Гейминг:</strong> {gameText}
                  </li>
                  <li>
                    <strong className="text-foreground">Овърклок:</strong> {ocText}
                  </li>
                  <li>
                    <strong className="text-foreground">Бюджетен билд:</strong>{' '}
                    {c.price < 140
                      ? 'Ценовият клас е подходящ за entry системи — внимавай с кутията (форм фактор) и захранването.'
                      : 'Среден/горен ценови сегмент — балансирай с останалите компоненти.'}
                  </li>
                  <li>
                    <strong className="text-foreground">Реална употреба:</strong> {futText} Разликата спрямо друго дъно
                    на практика се усеща при много NVMe дискове, USB аксесоари, или когато планираш ъпгрейд на CPU със същия
                    сокет.
                  </li>
                </ul>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <ConclusionBlock components={components} scores={scores} formatPrice={formatPrice} />
    </div>
  )
}

function CoolingAnalysis({ components, formatPrice }: Omit<Props, 'categorySlug'>) {
  const scores = components.map(scoreCooling)
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Подробно сравнение — охлаждане</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Критерий</th>
                {components.map((c) => (
                  <th key={c.id} className="p-2 min-w-[130px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['type', 'Тип (въздушно / AIO според данни)'],
                  ['tdp_rating', 'TDP рейтинг (W)'],
                  ['noise_level', 'Шум (dB апрокс.)'],
                  ['height', 'Височина (мм)'],
                  ['radiator_size', 'Радиатор (мм)'],
                  ['fan_count', 'Вентилатори (бр.)'],
                  ['socket_support', 'Поддържани сокети'],
                  ['price', 'Цена'],
                ] as const
              ).map(([key, label]) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {components.map((c) => (
                    <td key={c.id} className="p-2">
                      {key === 'price' ? formatPrice(c.price) : fmt((c.specs as Record<string, unknown>)[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Анализ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Тип:</strong> въздушните решения са по-прости и без риск от теч; AIO
            често охлажда по-равномерно при висок TDP, но изисква място за радиатор в кутията.
          </p>
          <p>
            <strong className="text-foreground">Ефективност:</strong> сравни TDP рейтинга с реалния TDP на процесора —
            остави запас ~10–20%.
          </p>
          <p>
            <strong className="text-foreground">Шум и монтаж:</strong> по-ниски dB и по-малко вентилатори често значат
            по-комфортна система; провери дали височината влиза в максимума на кутията.
          </p>
          <p>
            <strong className="text-foreground">Водно:</strong> помпата и радиаторът са точки на износ; избирай с
            гаранция и установен производител.
          </p>
          <p>
            <strong className="text-foreground">Цена/производителност:</strong> при бюджетен билд често печели добър
            въздушен „tower“; при горещ CPU или тиха машина — AIO 240/360 mm.
          </p>
          {components.map((c) => {
            const s = c.specs || {}
            const t = String(s.type || '').toLowerCase()
            const isAio = t.includes('водно') || t.includes('aio') || t.includes('liquid') || safeNum(s.radiator_size) > 0
            return (
              <div key={c.id} className="rounded-lg border border-border/50 bg-background/50 p-3">
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="mt-1">
                  {isAio
                    ? 'Ориентир: водно/AIO — гледай размера на радиатора спряму кутията и шума под натоварване.'
                    : 'Ориентир: въздушно — подходящо за по-малък риск и по-лесна поддръжка.'}{' '}
                  <strong className="text-foreground">Цена:</strong> {formatPrice(c.price)}.
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <ConclusionBlock components={components} scores={scores} formatPrice={formatPrice} />
    </div>
  )
}

function CaseAnalysis({ components, formatPrice }: Omit<Props, 'categorySlug'>) {
  const scores = components.map(scoreCase)
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Подробно сравнение — кутия</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Критерий</th>
                {components.map((c) => (
                  <th key={c.id} className="p-2 min-w-[130px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['form_factor', 'Форм фактор (Mid/Full/Mini)'],
                  ['motherboard_support', 'Дъна (ATX / mATX / ITX)'],
                  ['fan_slots', 'Слотове за вентилатори'],
                  ['included_fans', 'Включени вентилатори'],
                  ['radiator_support', 'Радиатор max (мм)'],
                  ['max_gpu_length', 'Макс. GPU дължина (мм)'],
                  ['max_cpu_cooler_height', 'Макс. височина охладител (мм)'],
                  ['side_panel', 'Панел (mesh / glass…)'],
                  ['drive_bays_2_5', '2.5\" отсека'],
                  ['drive_bays_3_5', '3.5\" отсеци'],
                  ['price', 'Цена'],
                ] as const
              ).map(([key, label]) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {components.map((c) => (
                    <td key={c.id} className="p-2">
                      {key === 'price' ? formatPrice(c.price) : fmt((c.specs as Record<string, unknown>)[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Airflow, дизайн, приложение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Airflow:</strong> mesh преден/горен панел и повече въздушни потоци
            намаляват температурата; стъклен преден панел без перфорация често вдига GPU температури.
          </p>
          <p>
            <strong className="text-foreground">I/O:</strong> броят USB и Type‑C рядко е в specs JSON — провери сайта на
            производителя за предния панел.
          </p>
          <p>
            <strong className="text-foreground">Cable management:</strong> оценявай дълбочината зад дъното и капаци за
            кабели по снимки от магазина/ревюта.
          </p>
          {components.map((c) => {
            const s = c.specs || {}
           const side = String(s.side_panel || '').toLowerCase()
            const meshy = side.includes('mesh') || side.includes('мреж')
            const fans = safeNum(s.fan_slots) + safeNum(s.included_fans) * 2
            const tier =
              c.price > 150 && safeNum(s.max_gpu_length) > 340
                ? 'high-end / gaming'
                : c.price < 90
                  ? 'бюджетен'
                  : 'среден клас'
            return (
              <div key={c.id} className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                <p className="font-medium text-foreground">{c.name}</p>
                <p>
                  <strong className="text-foreground">Сегмент:</strong> {tier}.{' '}
                  <strong className="text-foreground">Airflow ориентир:</strong>{' '}
                  {meshy
                    ? 'Панелът предполага по-добър прием на въздух (mesh/перфорация в данните).'
                    : 'Без mesh в описанието — може да е по-затворена кутия; важни са позициите на вентилаторите.'}{' '}
                  Индекс на вентилация (грубо): {fans}.
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Кое има по-добър airflow?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {(() => {
            const ranked = components
              .map((c) => {
                const s = c.specs || {}
                let pts = safeNum(s.fan_slots) * 3 + safeNum(s.included_fans) * 5
                const side = String(s.side_panel || '').toLowerCase()
                if (side.includes('mesh') || side.includes('мреж')) pts += 25
                pts += safeNum(s.radiator_support) / 40
                return { c, pts }
              })
              .sort((a, b) => b.pts - a.pts)
            const best = ranked[0]
            if (!best) return null
            return (
              <p>
                По комбинация от слотове за вентилатори, включени вентилатори, mesh панел и поддръжка на радиатор, най-напред
                изглежда <strong className="text-foreground">{best.c.name}</strong>. Реалният airflow зависи и от
                конфигурацията на вентилаторите (налягане vs поток) и праховите филтри.
              </p>
            )
          })()}
        </CardContent>
      </Card>

      <ConclusionBlock components={components} scores={scores} formatPrice={formatPrice} />
    </div>
  )
}

function StorageAnalysis({ components, formatPrice }: Omit<Props, 'categorySlug'>) {
  const scores = components.map(scoreStorage)
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Подробно сравнение — съхранение</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Критерий</th>
                {components.map((c) => (
                  <th key={c.id} className="p-2 min-w-[120px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['type', 'Тип носител'],
                  ['interface', 'Интерфейс (SATA/NVMe…)'],
                  ['capacity', 'Капацитет (GB)'],
                  ['read_speed', 'Четене (MB/s)'],
                  ['write_speed', 'Запис (MB/s)'],
                  ['tbw', 'TBW (издръжливост)'],
                  ['dram', 'DRAM кеш'],
                  ['rpm', 'RPM (HDD)'],
                  ['price', 'Цена'],
                ] as const
              ).map(([key, label]) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {components.map((c) => (
                    <td key={c.id} className="p-2">
                      {key === 'price'
                        ? formatPrice(c.price)
                        : key === 'capacity'
                          ? fmt(safeNum((c.specs as Record<string, unknown>).capacity) || '—')
                          : fmt((c.specs as Record<string, unknown>)[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Анализ: реална скорост и NVMe vs SATA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Зареждане на Windows/игри:</strong> NVMe с високи MB/s намалява времето
            за копиране и някои loading екрани; в игри често печелиш секунди–десетки секунди спрямо SATA, не винаги
            драматично.
          </p>
          <p>
            <strong className="text-foreground">NVMe спрямо SATA:</strong> за нов билд почти винаги си заслужава NVMe за
            системен диск; SATA SSD остава ок за втори диск или бюджетен ъпгрейд на стара платформа.
          </p>
          <p>
            <strong className="text-foreground">SSD vs HDD:</strong> HDD е за архиви и голям капацитет евтино; за ОС и
            игри HDD е усещаемо по-бавен и по-шумен.
          </p>
          <p>
            <strong className="text-foreground">Надеждност:</strong> TBW е ориентир за запис — при тежък торент/видео
            монтаж гледай по-висок TBW.
          </p>
        </CardContent>
      </Card>

      <ConclusionBlock components={components} scores={scores} formatPrice={formatPrice} />
    </div>
  )
}

function PsuAnalysis({ components, formatPrice }: Omit<Props, 'categorySlug'>) {
  const scores = components.map(scorePsu)
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Подробно сравнение — захранване</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Критерий</th>
                {components.map((c) => (
                  <th key={c.id} className="p-2 min-w-[120px]">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['wattage', 'Мощност (W)'],
                  ['efficiency', 'Сертификат (80+ …)'],
                  ['modular', 'Модулност'],
                  ['atx_version', 'ATX / PCIe стандарт'],
                  ['fan_size', 'Вентилатор (мм)'],
                  ['pcie_connectors', 'PCIe конектори'],
                  ['sata_connectors', 'SATA конектори'],
                  ['warranty_years', 'Гаранция (г.)'],
                  ['price', 'Цена'],
                ] as const
              ).map(([key, label]) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{label}</td>
                  {components.map((c) => (
                    <td key={c.id} className="p-2">
                      {key === 'price' ? formatPrice(c.price) : fmt((c.specs as Record<string, unknown>)[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Анализ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Gaming / high-end GPU:</strong> гледай wattage с ~20–30% запас спрямо
            осреднена консумация на системата; при RTX 40/50 серии ATX 3.0 и 12VHPWR в полето atx_version е плюс.
          </p>
          <p>
            <strong className="text-foreground">Ефективност:</strong> Gold/Platinum намалява загубите и топлината при висок
            товар — по-тиха и стабилна работа в дългосрочен план.
          </p>
          <p>
            <strong className="text-foreground">Модулност:</strong> пълно модулно улеснява кабелния мениджмънт и
            въздушния поток.
          </p>
          <p>
            <strong className="text-foreground">Реална употреба:</strong> евтини единици с лъскав етикет често имат по-слаби
            вътрешности — при скъпи компоненти инвестирай в утвърдени серии.
          </p>
        </CardContent>
      </Card>

      <ConclusionBlock components={components} scores={scores} formatPrice={formatPrice} />
    </div>
  )
}

export function CompareCategoryAnalysis({ categorySlug, components, formatPrice }: Props) {
  switch (categorySlug) {
    case 'motherboard':
      return <MotherboardAnalysis components={components} formatPrice={formatPrice} />
    case 'cooling':
      return <CoolingAnalysis components={components} formatPrice={formatPrice} />
    case 'case':
      return <CaseAnalysis components={components} formatPrice={formatPrice} />
    case 'storage':
      return <StorageAnalysis components={components} formatPrice={formatPrice} />
    case 'psu':
      return <PsuAnalysis components={components} formatPrice={formatPrice} />
    default:
      return null
  }
}
