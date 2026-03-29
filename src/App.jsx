import { useEffect, useState } from 'react'
import './App.css'

const API_KEY = import.meta.env.VITE_DOG_API_KEY
const REQUEST_TIMEOUT_MS = 10000

const formatValue = (value, fallback = 'Not listed') => {
  if (!value || value.trim() === '') {
    return fallback
  }

  return value
}

const normalizeBreed = (breed) => {
  if (!breed?.name || !breed?.image?.url) {
    return null
  }

  return {
    id: breed.id,
    imageUrl: breed.image.url,
    breedName: formatValue(breed.name),
    breedGroup: formatValue(breed.breed_group),
    lifeSpan: formatValue(breed.life_span),
    temperament: formatValue(breed.temperament, 'No temperament listed'),
  }
}

const buildBreedsApiUrl = () => {
  const params = new URLSearchParams({
    limit: '200',
    api_key: API_KEY,
  })

  return `https://api.thedogapi.com/v1/breeds?${params.toString()}`
}

const getRandomDog = (dogs, banList, currentDogId) => {
  const availableDogs = dogs.filter(
    (dog) => !banList.includes(dog.breedName) && dog.id !== currentDogId,
  )

  if (availableDogs.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * availableDogs.length)
  return availableDogs[randomIndex]
}

function App() {
  const [currentDog, setCurrentDog] = useState(null)
  const [allDogs, setAllDogs] = useState([])
  const [banList, setBanList] = useState([])
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchDogs = async () => {
    setIsLoading(true)
    setError('')

    try {
      if (!API_KEY) {
        throw new Error('Missing Dog API key. Add VITE_DOG_API_KEY to your .env file.')
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      )

      let response

      try {
        response = await fetch(buildBreedsApiUrl(), {
          signal: controller.signal,
        })
      } finally {
        window.clearTimeout(timeoutId)
      }

      if (!response.ok) {
        throw new Error('The dog API request failed.')
      }

      const data = await response.json()
      const validDogs = data.map(normalizeBreed).filter(Boolean)

      if (validDogs.length === 0) {
        throw new Error('The dog API returned breeds without usable images.')
      }

      setAllDogs(validDogs)
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        setError('The dog API took too long to respond. Check your connection and try again.')
        return
      }

      setError(fetchError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDog = () => {
    setError('')

    const nextDog = getRandomDog(allDogs, banList, currentDog?.id)

    if (!nextDog) {
      setError('No new dogs matched your filters. Remove a banned breed and try again.')
      return
    }

    setCurrentDog(nextDog)
    setHistory((previousHistory) => {
      const updatedHistory = [nextDog, ...previousHistory]
      return updatedHistory.slice(0, 8)
    })
  }

  useEffect(() => {
    fetchDogs()
  }, [])

  useEffect(() => {
    if (allDogs.length > 0 && !currentDog) {
      fetchDog()
    }
  }, [allDogs, currentDog, banList])

  const toggleBan = (value) => {
    setBanList((previousBanList) => {
      if (previousBanList.includes(value)) {
        return previousBanList.filter((item) => item !== value)
      }

      return [...previousBanList, value]
    })
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Week 5 Project 4</p>
        <h1>Veni Vici Dog Scout</h1>
        <p className="hero-copy">
          Discover one random dog breed at a time. Click the breed name on a dog
          card to add it to the ban list, and that breed will not appear again
          until you remove it.
        </p>

        <div className="actions">
          <button
            className="discover-button"
            onClick={fetchDog}
            disabled={isLoading || allDogs.length === 0}
          >
            {isLoading ? 'Finding a dog...' : 'Discover Dog'}
          </button>
          <p className="status-text">
            {banList.length} banned breed{banList.length === 1 ? '' : 's'}
          </p>
        </div>

        {error && <p className="error-message">{error}</p>}

        {currentDog && (
          <article className="dog-card">
            <div className="image-wrap">
              <img
                src={currentDog.imageUrl}
                alt={currentDog.breedName}
                className="dog-image"
              />
            </div>

            <div className="card-content">
              <p className="card-label">Current discovery</p>
              <h2>{currentDog.breedName}</h2>
              <p className="card-instruction">
                Click the breed pill below to ban this breed from future
                discoveries.
              </p>

              <div className="attribute-grid">
                <button
                  className={`attribute-pill ${
                    banList.includes(currentDog.breedName) ? 'is-banned' : ''
                  }`}
                  onClick={() => toggleBan(currentDog.breedName)}
                  type="button"
                >
                  <span>Breed</span>
                  <strong>{currentDog.breedName}</strong>
                </button>

                <div className="attribute-pill static-pill">
                  <span>Breed Group</span>
                  <strong>{currentDog.breedGroup}</strong>
                </div>

                <div className="attribute-pill static-pill">
                  <span>Life Span</span>
                  <strong>{currentDog.lifeSpan}</strong>
                </div>

                <div className="attribute-pill static-pill full-width">
                  <span>Temperament</span>
                  <strong>{currentDog.temperament}</strong>
                </div>
              </div>
            </div>
          </article>
        )}
      </section>

      <aside className="sidebar">
        <section className="sidebar-panel">
          <div className="panel-heading">
            <p className="eyebrow">Ban List</p>
            <h3>Blocked breeds</h3>
          </div>

          {banList.length === 0 ? (
            <p className="empty-state">
              Click the breed pill on a dog card to add it here. Any breed in
              this list is blocked from future results until you remove it.
            </p>
          ) : (
            <div className="ban-list">
              {banList.map((breed) => (
                <button
                  className="ban-chip"
                  key={breed}
                  onClick={() => toggleBan(breed)}
                  type="button"
                >
                  {breed} x
                </button>
              ))}
            </div>
          )}

          {banList.length > 0 && (
            <p className="ban-help">
              Click a breed in this list to remove it and allow it to appear
              again.
            </p>
          )}
        </section>

        <section className="sidebar-panel">
          <div className="panel-heading">
            <p className="eyebrow">History</p>
            <h3>Seen this session</h3>
          </div>

          {history.length === 0 ? (
            <p className="empty-state">Your discoveries will appear here.</p>
          ) : (
            <div className="history-list">
              {history.map((dog, index) => (
                <article className="history-card" key={`${dog.id}-${index}`}>
                  <img
                    src={dog.imageUrl}
                    alt={dog.breedName}
                    className="history-image"
                  />
                  <div>
                    <p className="history-title">{dog.breedName}</p>
                    <p className="history-meta">{dog.lifeSpan}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>
    </main>
  )
}

export default App
