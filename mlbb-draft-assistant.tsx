"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  Clock,
  Shield,
  Sword,
  Zap,
  Settings,
  ChevronRight,
  Award,
  Target,
  Flame,
  Cpu,
  RefreshCw,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import heroData from '@/data/heroes.json'
import { config } from './app/config'

interface Hero {
  id: number;
  name: string;
  image: string;
  role: string;
  winRate: number;
}

function getHeroRole(name: string): string {
  const roleMap: { [key: string]: string } = {
    'Layla': 'Marksman',
    'Miya': 'Marksman',
    'Alucard': 'Fighter',
    'Franco': 'Tank',
    'Balmond': 'Fighter',
    'Eudora': 'Mage',
    'Zilong': 'Fighter',
    'Bane': 'Fighter',
    'Tigreal': 'Tank',
    'Alice': 'Mage'
  };
  return roleMap[name] || 'Unknown';
}

function getHeroWinRate(name: string): number {
  const winRateMap: { [key: string]: number } = {
    'Layla': 48.5,
    'Miya': 49.2,
    'Alucard': 47.8,
    'Franco': 50.1,
    'Balmond': 48.9,
    'Eudora': 49.5,
    'Zilong': 48.2,
    'Bane': 47.5,
    'Tigreal': 50.3,
    'Alice': 49.8
  };
  return winRateMap[name] || 50.0;
}

const LANES = ["Gold Lane", "EXP Lane", "Mid Lane", "Jungle", "Roam"];

export default function MLBBDraftAssistant() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("All")
  const [sortBy, setSortBy] = useState("winRate")
  const [blueTeam, setBlueTeam] = useState<Array<Hero | null>>(Array(5).fill(null))
  const [redTeam, setRedTeam] = useState<Array<Hero | null>>(Array(5).fill(null))
  const [bannedHeroes, setBannedHeroes] = useState<Array<Hero | null>>(Array(6).fill(null))
  const [draftTime, setDraftTime] = useState(115) // in seconds
  const [activeTeam, setActiveTeam] = useState<"blue" | "red">("blue")
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [loadingHeroes, setLoadingHeroes] = useState(true)
  const [heroLanes, setHeroLanes] = useState<{ [heroId: number]: string }>({})
  const [laneValidation, setLaneValidation] = useState<{ [heroId: number]: { is_optimal: boolean, explanation: string } }>({})
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [banSlotIndex, setBanSlotIndex] = useState<number | null>(null)
  const [banWarning, setBanWarning] = useState<string | null>(null)
  const [banSearch, setBanSearch] = useState("")
  const [banRole, setBanRole] = useState("All")
  const [banSelected, setBanSelected] = useState<Hero | null>(null)

  // Fetch hero data from API
  useEffect(() => {
    async function fetchHeroes() {
      setLoadingHeroes(true)
      try {
        // Map the new heroData.data array to our Hero interface
        const heroes: Hero[] = (heroData.data || []).filter((h: any) => h.hero_name && h.portrait).map((hero: any, idx: number) => ({
          id: Number(hero.mlid) || idx + 1,
          name: hero.hero_name,
          image: hero.portrait,
          role: hero.class || getHeroRole(hero.hero_name),
          winRate: getHeroWinRate(hero.hero_name)
        }))
        setHeroes(heroes)
      } catch (e) {
        setError('Failed to load hero data from API')
      } finally {
        setLoadingHeroes(false)
      }
    }
    fetchHeroes()
  }, [])

  // Filter heroes based on search and role
  const filteredHeroes = heroes.filter((hero) => {
    const matchesSearch = hero.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === "All" || hero.role === selectedRole
    const notSelected = ![...blueTeam, ...redTeam, ...bannedHeroes].some(
      (selected) => selected && selected.id === hero.id,
    )
    return matchesSearch && matchesRole && notSelected
  }).sort((a, b) => {
    if (sortBy === "winRate") return b.winRate - a.winRate
    if (sortBy === "name") return a.name.localeCompare(b.name)
    return 0
  })

  // Timer effect
  useEffect(() => {
    if (draftTime <= 0) return

    const timer = setInterval(() => {
      setDraftTime((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [draftTime])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Add hero to team
  const addHero = (hero: Hero, team: "blue" | "red", position: number) => {
    if (team === "blue") {
      const newTeam = [...blueTeam]
      newTeam[position] = hero
      setBlueTeam(newTeam)
    } else {
      const newTeam = [...redTeam]
      newTeam[position] = hero
      setRedTeam(newTeam)
    }
  }

  // Open ban modal for a slot
  const openBanModal = (index: number) => {
    setBanSlotIndex(index)
    setBanModalOpen(true)
  }

  // Ban a hero
  const banHero = (hero: Hero, position: number) => {
    const newBanned = [...bannedHeroes]
    newBanned[position] = hero
    setBannedHeroes(newBanned)
    setBanModalOpen(false)
    setBanSlotIndex(null)
    // Remove from blue/red team if picked
    let removed = false
    const blueIdx = blueTeam.findIndex(h => h && h.id === hero.id)
    if (blueIdx !== -1) {
      removeHero("blue", blueIdx)
      removed = true
    }
    const redIdx = redTeam.findIndex(h => h && h.id === hero.id)
    if (redIdx !== -1) {
      removeHero("red", redIdx)
      removed = true
    }
    if (removed) {
      setBanWarning(`${hero.name} was already picked and has been removed from the team because they are now banned.`)
      setTimeout(() => setBanWarning(null), 4000)
    }
  }

  // Reset draft
  const resetDraft = () => {
    setBlueTeam(Array(5).fill(null))
    setRedTeam(Array(5).fill(null))
    setBannedHeroes(Array(6).fill(null))
    setDraftTime(115)
    setAnalysisResults(null)
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const myHero = blueTeam[0]?.name || ""
      const team_heroes = blueTeam.slice(1).filter(Boolean).map(h => h!.name)
      const enemy_heroes = redTeam.filter(Boolean).map(h => h!.name)
      // Build assigned lanes mapping
      const assigned_lanes: { [hero: string]: string } = {}
      blueTeam.forEach((hero) => {
        if (hero && heroLanes[hero.id]) {
          assigned_lanes[hero.name] = heroLanes[hero.id]
        }
      })
      // Collect banned hero names
      const banned_heroes = bannedHeroes.filter(Boolean).map(h => h!.name)
      if (!myHero) {
        setError("Please select at least your first hero (as 'You') in the blue team.")
        setIsAnalyzing(false)
        return
      }
      const response = await fetch(`${config.apiUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ my_hero: myHero, team_heroes, enemy_heroes, assigned_lanes, banned_heroes })
      })
      if (!response.ok) throw new Error('Failed to analyze heroes')
      const data = await response.json()
      setAnalysisResults(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Lane validation handler
  const handleLaneChange = async (hero: Hero, lane: string) => {
    setHeroLanes(prev => ({ ...prev, [hero.id]: lane }))
    setLaneValidation(prev => ({ ...prev, [hero.id]: { is_optimal: false, explanation: 'Validating...' } }))
    try {
      const res = await fetch(`${config.apiUrl}/validate-lane`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero: hero.name, lane })
      })
      const data = await res.json()
      setLaneValidation(prev => ({ ...prev, [hero.id]: { is_optimal: data.is_optimal, explanation: data.explanation } }))
    } catch {
      setLaneValidation(prev => ({ ...prev, [hero.id]: { is_optimal: false, explanation: 'AI validation failed.' } }))
    }
  }

  // Remove hero from team
  const removeHero = (team: "blue" | "red", index: number) => {
    if (team === "blue") {
      const newTeam = [...blueTeam]
      newTeam[index] = null
      setBlueTeam(newTeam)
    } else {
      const newTeam = [...redTeam]
      newTeam[index] = null
      setRedTeam(newTeam)
    }
  }

  // Ban modal filtering logic
  const banRoleOptions = ["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"]
  const filteredBanHeroes = heroes.filter(hero =>
    !bannedHeroes.some(b => b && b.id === hero.id) &&
    !blueTeam.some(h => h && h.id === hero.id) &&
    !redTeam.some(h => h && h.id === hero.id) &&
    (banRole === "All" || hero.role === banRole) &&
    hero.name.toLowerCase().includes(banSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 flex flex-col">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#30363d] p-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-[#00e676] font-bold text-2xl mr-2">MLBB</div>
          <div className="text-[#4cc9f0] font-bold text-2xl">DraftAssistant</div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar - Hero Selection */}
        <div className="w-64 bg-[#0d1117] border-r border-[#30363d] p-4 flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
            <Input
              placeholder="Search heroes..."
              className="pl-10 bg-[#161b22] border-[#30363d] text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <h3 className="text-xs text-slate-500 mb-2">ROLE FILTER</h3>
            <div className="flex flex-wrap gap-2">
              {["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"].map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  className={`text-xs px-3 py-1 h-auto ${
                    selectedRole === role
                      ? "bg-[#1f6feb] text-white border-[#1f6feb]"
                      : "bg-[#161b22] text-slate-400 border-[#30363d]"
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs text-slate-500 mb-2">SORT BY</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-3 py-1 h-auto ${
                  sortBy === "winRate"
                    ? "bg-[#238636] text-white border-[#238636]"
                    : "bg-[#161b22] text-slate-400 border-[#30363d]"
                }`}
                onClick={() => setSortBy("winRate")}
              >
                Win Rate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-3 py-1 h-auto ${
                  sortBy === "name"
                    ? "bg-[#161b22] text-white border-[#30363d]"
                    : "bg-[#161b22] text-slate-400 border-[#30363d]"
                }`}
                onClick={() => setSortBy("name")}
              >
                Alphabetical
              </Button>
            </div>
          </div>

          <h3 className="text-xs text-slate-500 mb-2">HEROES</h3>
          <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-2">
            {filteredHeroes.map((hero) => (
              <div
                key={hero.id}
                className="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden cursor-pointer hover:border-[#1f6feb] transition-colors"
                onClick={() => {
                  // Find first empty slot in active team
                  const team = activeTeam === "blue" ? blueTeam : redTeam
                  const emptyIndex = team.findIndex((h) => h === null)
                  if (emptyIndex !== -1) {
                    addHero(hero, activeTeam, emptyIndex)
                  }
                }}
              >
                <div className="relative">
                  <img
                    src={hero.image}
                    alt={hero.name}
                    className="w-full aspect-square object-cover"
                  />
                  <Badge
                    className={`absolute bottom-1 right-1 text-xs ${
                      hero.role === "Tank"
                        ? "bg-[#0d47a1]"
                        : hero.role === "Fighter"
                          ? "bg-[#b71c1c]"
                          : hero.role === "Assassin"
                            ? "bg-[#880e4f]"
                            : hero.role === "Mage"
                              ? "bg-[#4a148c]"
                              : hero.role === "Marksman"
                                ? "bg-[#e65100]"
                                : "bg-[#1b5e20]"
                    }`}
                  >
                    {hero.role}
                  </Badge>
                </div>
                <div className="p-1">
                  <div className="text-xs font-medium truncate">{hero.name}</div>
                  <div className={`text-xs ${hero.winRate > 52 ? "text-[#4cc9f0]" : "text-slate-400"}`}>
                    {hero.winRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Draft Room</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-[#30363d] ${
                    activeTeam === "blue" ? "bg-[#0d47a1] text-white" : "bg-transparent text-slate-400"
                  }`}
                  onClick={() => setActiveTeam("blue")}
                >
                  BLUE TEAM
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-[#30363d] ${
                    activeTeam === "red" ? "bg-[#b71c1c] text-white" : "bg-transparent text-slate-400"
                  }`}
                  onClick={() => setActiveTeam("red")}
                >
                  RED TEAM
                </Button>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-slate-400 mr-1" />
                <span className="text-sm font-mono">Draft Timer: {formatTime(draftTime)}</span>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#1a1f29] to-[#161b22] border border-[#30363d] hover:border-[#f43f5e]/50 hover:bg-[#1a1f29] text-[#f43f5e] transition-all"
                onClick={resetDraft}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Reset Draft
              </Button>
              <Button size="sm" className="bg-[#238636] hover:bg-[#2ea043]">
                Save Draft
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={runAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>

          {/* Teams and Bans */}
          <div className="grid grid-cols-12 gap-4 mb-8">
            {/* Blue Team */}
            <div className="col-span-5">
              <div className="bg-[#0d1117] border border-[#1f6feb]/30 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[#4cc9f0] font-medium">Your Team (Blue)</h3>
                  <span className="text-xs text-slate-500">{blueTeam.filter(Boolean).length}/5 selected</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {blueTeam.map((hero, index) => (
                    <div
                      key={`blue-${index}`}
                      className={`aspect-square rounded-md overflow-hidden ${
                        hero ? "" : "border border-dashed border-[#30363d] bg-[#161b22]/50"
                      }`}
                    >
                      {hero ? (
                        <div className="relative h-full flex flex-col items-center justify-between p-1">
                          <button
                            className="absolute top-1 right-1 z-10 w-7 h-7 flex items-center justify-center bg-[#161b22]/80 hover:bg-[#f43f5e]/20 border-2 border-[#f43f5e] shadow-lg rounded-full transition-all duration-200 hover:scale-110 hover:shadow-2xl focus:outline-none"
                            style={{ lineHeight: 0 }}
                            onClick={() => removeHero("blue", index)}
                            aria-label="Remove hero"
                          >
                            <X className="w-4.5 h-4.5 text-[#f43f5e]" />
                          </button>
                          <img
                            src={hero.image}
                            alt={hero.name}
                            className="w-full h-3/5 object-cover rounded"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <div className="text-xs text-white truncate">{hero.name}</div>
                          </div>
                          {/* Lane dropdown */}
                          <div className="w-full mt-1 flex flex-col items-center">
                            <select
                              className="bg-[#161b22] border border-[#30363d] text-xs text-slate-200 rounded px-2 py-1 w-full focus:outline-none"
                              value={heroLanes[hero.id] || ""}
                              onChange={e => handleLaneChange(hero, e.target.value)}
                            >
                              <option value="">Select Lane</option>
                              {LANES.map(lane => (
                                <option key={lane} value={lane}>{lane}</option>
                              ))}
                            </select>
                            {/* AI validation badge/box */}
                            {heroLanes[hero.id] && laneValidation[hero.id] && (
                              <div
                                className={`mt-1 text-xs rounded px-2 py-1 w-full text-center font-medium ${
                                  laneValidation[hero.id].is_optimal
                                    ? "bg-green-900 text-green-300 border border-green-600"
                                    : laneValidation[hero.id].explanation === 'Validating...'
                                      ? "bg-yellow-900 text-yellow-200 border border-yellow-600"
                                      : "bg-yellow-900 text-yellow-200 border border-yellow-600"
                                }`}
                              >
                                {laneValidation[hero.id].is_optimal ? "✅ Optimal lane" : "⚠️ Not optimal"}
                                <div className="mt-0.5 text-xs font-normal text-slate-300">{laneValidation[hero.id].explanation}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[#4cc9f0]">
                          <Plus className="h-6 w-6" />
                          <span className="text-xs mt-1">Add</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Banned Heroes */}
            <div className="col-span-2">
              <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-slate-400 font-medium">Banned Heroes</h3>
                  <span className="text-xs text-slate-500">{bannedHeroes.filter(Boolean).length}/6 banned</span>
                </div>
                <div className="text-xs text-slate-500 mb-2">Banned heroes cannot be selected by either team.</div>
                <div className="grid grid-cols-3 gap-2">
                  {bannedHeroes.map((hero, index) => (
                    <div
                      key={`banned-${index}`}
                      className={`aspect-square rounded-md overflow-hidden cursor-pointer ${
                        hero ? "" : "border border-dashed border-[#30363d] bg-[#161b22]/50 hover:border-[#f43f5e]"
                      }`}
                      onClick={() => !hero && openBanModal(index)}
                      title={hero ? hero.name : "Ban a hero"}
                    >
                      {hero ? (
                        <div className="relative h-full">
                          <img
                            src={hero.image}
                            alt={hero.name}
                            className="w-full h-full object-cover opacity-50 grayscale"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-px w-full bg-red-500 rotate-45 absolute"></div>
                            <div className="h-px w-full bg-red-500 -rotate-45 absolute"></div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <div className="text-xs text-red-300 truncate text-center">{hero.name}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="h-8 w-8 rounded-full bg-[#161b22] flex items-center justify-center">
                            <span className="text-slate-600">X</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {banWarning && (
                  <div className="mt-2 text-xs text-yellow-400 bg-[#161b22] border border-yellow-600 rounded p-2 text-center">{banWarning}</div>
                )}
              </div>
            </div>

            {/* Red Team */}
            <div className="col-span-5">
              <div className="bg-[#0d1117] border border-[#b71c1c]/30 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[#ff5a5f] font-medium">Enemy Team (Red)</h3>
                  <span className="text-xs text-slate-500">{redTeam.filter(Boolean).length}/5 selected</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {redTeam.map((hero, index) => (
                    <div
                      key={`red-${index}`}
                      className={`aspect-square rounded-md overflow-hidden ${
                        hero ? "" : "border border-dashed border-[#30363d] bg-[#161b22]/50"
                      }`}
                    >
                      {hero ? (
                        <div className="relative h-full flex flex-col items-center justify-between p-1">
                          <button
                            className="absolute top-1 right-1 z-10 w-7 h-7 flex items-center justify-center bg-[#161b22]/80 hover:bg-[#f43f5e]/20 border-2 border-[#f43f5e] shadow-lg rounded-full transition-all duration-200 hover:scale-110 hover:shadow-2xl focus:outline-none"
                            style={{ lineHeight: 0 }}
                            onClick={() => removeHero("red", index)}
                            aria-label="Remove hero"
                          >
                            <X className="w-4.5 h-4.5 text-[#f43f5e]" />
                          </button>
                          <img
                            src={hero.image}
                            alt={hero.name}
                            className="w-full h-3/5 object-cover rounded"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <div className="text-xs text-white truncate">{hero.name}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[#ff5a5f]">
                          <Plus className="h-6 w-6" />
                          <span className="text-xs mt-1">Add</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Sections */}
          <div className="grid grid-cols-3 gap-6">
            {/* AI Hero Recommendations */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#0d1117] to-[#1a1f29] border-b border-[#30363d] p-3 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-[#4cc9f0]/20 p-1.5 rounded-md mr-2">
                    <Cpu className="h-4 w-4 text-[#4cc9f0]" />
                  </div>
                  <h3 className="font-medium text-[#4cc9f0]">AI Hero Recommendation</h3>
                </div>
              </div>

              <div className="p-4">
                {/* Recommendation Picks */}
                <div>
                  <div className="flex items-center mb-2">
                    <div className="bg-[#1f6feb]/20 p-1 rounded-full mr-2">
                      <Award className="h-3.5 w-3.5 text-[#1f6feb]" />
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <h4 className="text-sm font-medium text-[#1f6feb]">Recommended Teammates to Complete Your Team</h4>
                      <span className="text-xs text-slate-500">high-synergy suggestions</span>
                    </div>
                  </div>
                  {analysisResults ? (
                    <div className="space-y-4">
                      {/* Synergy Picks */}
                      {blueTeam[0] && (
                        <div>
                          <div className="text-xs text-slate-400 mb-2">Recommended Teammates to Complete Your Team</div>
                          <div className="flex gap-4 flex-wrap">
                            {(() => {
                              const pickedNames = blueTeam.filter(Boolean).map(h => h!.name.toLowerCase());
                              const slotsLeft = 5 - blueTeam.filter(Boolean).length;
                              const synergies = Array.isArray(analysisResults.synergies) && analysisResults.synergies.length > 0 && typeof analysisResults.synergies[0] === 'object'
                                ? analysisResults.synergies
                                : analysisResults.synergies.map((name: string) => ({ name, role: undefined }));
                              return synergies
                                .filter((hero: { name: string, role?: string }) => !pickedNames.includes(hero.name.toLowerCase()))
                                .slice(0, slotsLeft)
                                .map((hero: { name: string, role?: string }, idx: number) => {
                                  const heroObj = heroes.find(h => h.name.toLowerCase() === hero.name.toLowerCase());
                                  if (!heroObj) return null;
                                  return (
                                    <div
                                      key={idx}
                                      className="flex flex-col items-center bg-[#161b22] border border-[#30363d] rounded-xl p-4 w-32 shadow-lg hover:border-[#1f6feb] transition-colors"
                                    >
                                      <div className="relative">
                                        <img
                                          src={heroObj.image}
                                          alt={heroObj.name}
                                          className="w-20 h-20 object-cover rounded-lg"
                                        />
                                        {idx < slotsLeft && (
                                          <div className="absolute -top-2 -right-2 bg-[#1f6feb] text-white text-xs px-2 py-0.5 rounded-full shadow">
                                            {idx + 1}
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-3 text-sm font-semibold text-blue-200 truncate w-full text-center">
                                        {heroObj.name}
                                      </div>
                                      {hero.role && (
                                        <div className="mt-1 text-xs text-[#4cc9f0] font-medium bg-[#1f6feb]/10 px-2 py-0.5 rounded-full text-center">
                                          {hero.role}
                                        </div>
                                      )}
                                      <Badge className={`mt-2 text-xs px-3 py-1 ${
                                        heroObj.role === "Tank"
                                          ? "bg-[#0d47a1]"
                                          : heroObj.role === "Fighter"
                                          ? "bg-[#b71c1c]"
                                          : heroObj.role === "Assassin"
                                          ? "bg-[#880e4f]"
                                          : heroObj.role === "Mage"
                                          ? "bg-[#4a148c]"
                                          : heroObj.role === "Marksman"
                                          ? "bg-[#e65100]"
                                          : "bg-[#1b5e20]"
                                      }`}>
                                        {heroObj.role}
                                      </Badge>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-12">
                      <div className="flex items-center text-slate-400">
                        <div className="bg-[#1f6feb]/10 p-1.5 rounded-full mr-2 animate-pulse">
                          <Cpu className="h-4 w-4 text-[#1f6feb]/70" />
                        </div>
                        <p className="text-sm">Select your hero and teammates, then analyze to see recommendations</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Build Suggestions */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#0d1117] to-[#1a1f29] border-b border-[#30363d] p-3">
                <div className="flex items-center">
                  <div className="bg-[#ff9f1c]/20 p-1.5 rounded-md mr-2">
                    <Shield className="h-4 w-4 text-[#ff9f1c]" />
                  </div>
                  <h3 className="font-medium text-[#ff9f1c]">Build Suggestions</h3>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#ff9f1c] mr-2"></div>
                  <p className="text-sm text-slate-400">Optimized builds for your current heroes</p>
                </div>

                <div className="bg-[#161b22] rounded-md border border-[#30363d]/50 overflow-hidden">
                  <div className="bg-gradient-to-b from-[#161b22] to-[#0d1117] p-6 flex flex-col items-center justify-center">
                    <div className="bg-[#ff9f1c]/10 p-3 rounded-full mb-3">
                      <Shield className="h-6 w-6 text-[#ff9f1c]/70" />
                    </div>
                    {analysisResults ? (
                      <div className="flex flex-col gap-2">
                        {analysisResults.build.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-yellow-300">{item.name}: {item.description}</div>
                        ))}
                        <div className="text-purple-300">Emblem: {analysisResults.build.emblem}</div>
                        <div className="text-cyan-300">Spell: {analysisResults.build.spell}</div>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-400">...Select your hero to see build recommendations</div>
                    )}

                    <div className="grid grid-cols-6 gap-2 mt-4 w-full max-w-xs opacity-30">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="aspect-square bg-[#1a1f29] rounded-md border border-[#30363d]/50"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Recommendations */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#0d1117] to-[#1a1f29] border-b border-[#30363d] p-3">
                <div className="flex items-center">
                  <div className="bg-[#f43f5e]/20 p-1.5 rounded-md mr-2">
                    <Sword className="h-4 w-4 text-[#f43f5e]" />
                  </div>
                  <h3 className="font-medium text-[#f43f5e]">Strategy Recommendations</h3>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#f43f5e] mr-2"></div>
                  <p className="text-sm text-slate-400">Based on current draft analysis</p>
                </div>

                {/* Lane Assignments */}
                <div>
                  <div className="flex items-center mb-2">
                    <div className="bg-[#60a5fa]/20 p-1 rounded-full mr-2">
                      <ChevronRight className="h-3.5 w-3.5 text-[#60a5fa]" />
                    </div>
                    <h4 className="text-sm font-medium text-[#60a5fa]">Recommended Lane Assignments</h4>
                  </div>
                  <div className="bg-[#161b22] rounded-md p-3 border border-[#30363d]/50">
                    <div className="flex items-center justify-center h-12">
                      <div className="flex items-center text-slate-400">
                        <div className="bg-[#60a5fa]/10 p-1.5 rounded-full mr-2">
                          <ChevronRight className="h-4 w-4 text-[#60a5fa]/70" />
                        </div>
                        <p className="text-sm">Complete your team draft to see lane assignments</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Phase Strategy */}
                <div>
                  <div className="flex items-center mb-2">
                    <div className="bg-[#f97316]/20 p-1 rounded-full mr-2">
                      <Flame className="h-3.5 w-3.5 text-[#f97316]" />
                    </div>
                    <h4 className="text-sm font-medium text-[#f97316]">Game Phase Strategy</h4>
                  </div>
                  <div className="bg-[#161b22] rounded-md border border-[#30363d]/50 overflow-hidden">
                    <div className="p-3 border-b border-[#30363d]/50 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#f97316] mr-2"></div>
                        <span className="text-sm text-slate-300">Early Game (1-5 min)</span>
                      </div>
                      <div className="bg-[#238636]/20 px-2 py-0.5 rounded-full">
                        <span className="text-xs text-[#4ade80]">Farm Advantage</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center text-slate-400">
                        <div className="bg-[#f97316]/10 p-1.5 rounded-full mr-2">
                          <Flame className="h-4 w-4 text-[#f97316]/70" />
                        </div>
                        <p className="text-sm">Complete your team draft to see detailed strategy</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ban Modal */}
      {banModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-2xl shadow-xl">
            <h4 className="text-lg font-semibold mb-4 text-[#f43f5e]">Ban a Hero</h4>
            {/* Search and Role Filters */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search heroes..."
                className="bg-[#222] border border-[#30363d] rounded px-3 py-1 text-slate-200 text-sm focus:outline-none w-full md:w-64"
                value={banSearch}
                onChange={e => setBanSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {banRoleOptions.map(role => (
                  <button
                    key={role}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors duration-100 ${
                      banRole === role
                        ? "bg-[#f43f5e] text-white border-[#f43f5e]"
                        : "bg-[#222] text-slate-300 border-[#30363d] hover:bg-[#f43f5e]/20"
                    }`}
                    onClick={() => setBanRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            {/* Hero Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-96 overflow-y-auto mb-4">
              {filteredBanHeroes.map(hero => {
                const isSelected = banSelected && banSelected.id === hero.id
                return (
                  <div
                    key={hero.id}
                    className={`relative flex flex-col items-center cursor-pointer bg-[#222] border rounded-lg p-2 transition-all duration-150
                      ${isSelected ? "border-2 border-[#f43f5e] ring-2 ring-[#f43f5e]/40" : "border-[#30363d] hover:border-[#f43f5e]"}
                    `}
                    onClick={() => setBanSelected(hero)}
                  >
                    <img src={hero.image} alt={hero.name} className="w-14 h-14 object-cover rounded mb-1" />
                    <div className="text-xs text-slate-200 text-center truncate w-full">{hero.name}</div>
                    <Badge className="mt-1 text-xs">{hero.role}</Badge>
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#f43f5e]/60 flex items-center justify-center rounded-lg">
                        <span className="text-white font-bold text-xs px-2 py-1 bg-[#b71c1c] rounded">BANNED</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Confirm/Clear Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                className="flex-1 py-2 rounded bg-[#f43f5e] text-white font-semibold hover:bg-[#b71c1c] transition-colors disabled:opacity-50"
                disabled={!banSelected}
                onClick={() => banSlotIndex !== null && banSelected && banHero(banSelected, banSlotIndex)}
              >
                Confirm Ban
              </button>
              <button
                className="flex-1 py-2 rounded bg-[#222] text-slate-200 font-semibold border border-[#30363d] hover:bg-[#f43f5e]/20 transition-colors"
                onClick={() => setBanSelected(null)}
              >
                Clear All
              </button>
              <button
                className="flex-1 py-2 rounded bg-[#b71c1c] text-white font-semibold hover:bg-[#f43f5e] transition-colors"
                onClick={() => { setBanModalOpen(false); setBanSelected(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
