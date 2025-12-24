'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Challenge {
  id: string
  challenge_number: number
  title: string
  description: string
  difficulty: string
  category: string
  points: number
  hint: string
}

interface Candidate {
  id: string
  email: string
  name: string
}

export default function Home() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [answer, setAnswer] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissions, setSubmissions] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  useEffect(() => {
    loadChallenges()
    checkExistingCandidate()
  }, [])

  async function loadChallenges() {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('challenge_number')

    if (data) setChallenges(data)
    setLoading(false)
  }

  async function checkExistingCandidate() {
    const savedEmail = localStorage.getItem('candidate_email')
    if (savedEmail) {
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', savedEmail)
        .single()

      if (data) {
        setCandidate(data)
        loadSubmissions(data.id)
      }
    }
  }

  async function loadSubmissions(candidateId: string) {
    const { data } = await supabase
      .from('submissions')
      .select('challenge_id')
      .eq('candidate_id', candidateId)

    if (data) {
      const subMap: Record<string, boolean> = {}
      data.forEach(s => subMap[s.challenge_id] = true)
      setSubmissions(subMap)
    }
  }

  async function register() {
    if (!email || !name) return
    setRegistering(true)

    const { data, error } = await supabase
      .from('candidates')
      .insert({ email, name })
      .select()
      .single()

    if (data) {
      setCandidate(data)
      localStorage.setItem('candidate_email', email)
    } else if (error?.code === '23505') {
      const { data: existing } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', email)
        .single()
      if (existing) {
        setCandidate(existing)
        localStorage.setItem('candidate_email', email)
        loadSubmissions(existing.id)
      }
    }
    setRegistering(false)
  }

  async function submitAnswer() {
    if (!candidate || !selectedChallenge || !answer) return
    setSubmitting(true)

    const { error } = await supabase
      .from('submissions')
      .insert({
        candidate_id: candidate.id,
        challenge_id: selectedChallenge.id,
        answer,
        code_snippet: codeSnippet || null,
      })

    if (!error) {
      setSubmissions(prev => ({ ...prev, [selectedChallenge.id]: true }))
      setSelectedChallenge(null)
      setAnswer('')
      setCodeSnippet('')
    }
    setSubmitting(false)
  }

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-green-500/20 text-green-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'hard': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const categoryColor = (c: string) => {
    switch (c) {
      case 'rls': return 'bg-purple-500/20 text-purple-400'
      case 'storage': return 'bg-blue-500/20 text-blue-400'
      case 'auth': return 'bg-orange-500/20 text-orange-400'
      case 'queries': return 'bg-cyan-500/20 text-cyan-400'
      case 'migrations': return 'bg-pink-500/20 text-pink-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            IGTA-Tech Skills Assessment
          </h1>
          <p className="text-gray-400 mt-2">
            Supabase & Full-Stack Developer Evaluation
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!candidate ? (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6">Register to Begin</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                  placeholder="john@example.com"
                />
              </div>
              <button
                onClick={register}
                disabled={registering || !email || !name}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition"
              >
                {registering ? 'Registering...' : 'Start Assessment'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-400">Welcome back,</p>
                  <p className="text-xl font-semibold">{candidate.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-400">
                    {Object.keys(submissions).length} / {challenges.length}
                  </p>
                </div>
              </div>
            </div>

            {selectedChallenge && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-xs px-2 py-1 rounded ${difficultyColor(selectedChallenge.difficulty)}`}>
                        {selectedChallenge.difficulty}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ml-2 ${categoryColor(selectedChallenge.category)}`}>
                        {selectedChallenge.category}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedChallenge(null)}
                      className="text-gray-400 hover:text-white text-xl"
                    >
                      &times;
                    </button>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    Challenge #{selectedChallenge.challenge_number}: {selectedChallenge.title}
                  </h3>
                  <p className="text-gray-300 mb-4">{selectedChallenge.description}</p>

                  {selectedChallenge.hint && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                      <p className="text-yellow-400 text-sm">
                        <strong>Hint:</strong> {selectedChallenge.hint}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Your Solution (explain your approach)
                      </label>
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 h-32 focus:outline-none focus:border-green-500"
                        placeholder="Describe how you would solve this..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Code Snippet (optional)
                      </label>
                      <textarea
                        value={codeSnippet}
                        onChange={(e) => setCodeSnippet(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 h-40 font-mono text-sm focus:outline-none focus:border-green-500"
                        placeholder="-- SQL or TypeScript code here..."
                      />
                    </div>
                    <button
                      onClick={submitAnswer}
                      disabled={submitting || !answer}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition"
                    >
                      {submitting ? 'Submitting...' : `Submit Answer (+${selectedChallenge.points} pts)`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className={`bg-gray-900 rounded-xl p-6 border transition cursor-pointer hover:border-green-500/50 ${
                    submissions[challenge.id]
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-gray-800'
                  }`}
                  onClick={() => !submissions[challenge.id] && setSelectedChallenge(challenge)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${difficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${categoryColor(challenge.category)}`}>
                        {challenge.category}
                      </span>
                    </div>
                    <span className="text-green-400 font-semibold">+{challenge.points} pts</span>
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    #{challenge.challenge_number}: {challenge.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{challenge.description}</p>

                  {submissions[challenge.id] && (
                    <div className="mt-4 flex items-center text-green-400">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Submitted
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-gray-500">
        <p>IGTA-Tech Skills Assessment Platform</p>
        <p className="text-sm mt-1">Powered by Supabase + Next.js</p>
      </footer>
    </div>
  )
}
