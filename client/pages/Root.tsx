import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tldraw, createTLStore } from 'tldraw'

function generateWhiteboardId() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	const part = () =>
		Array.from({ length: 3 }, () =>
			chars[Math.floor(Math.random() * chars.length)],
		).join('')
	return `${part()}-${part()}-${part()}`
}

const PART_LENGTH = 3
const FULL_ID_LENGTH = 11 // XXX-YYY-ZZZ

export function Root() {
	const navigate = useNavigate()
	const store = createTLStore()

	const [parts, setParts] = useState(['', '', ''])
	const [isChecking, setIsChecking] = useState(false)
	const [whiteboardExists, setWhiteboardExists] = useState(false)

	const inputRefs = [
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
		useRef<HTMLInputElement>(null),
	]

	const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const whiteboardId = useMemo(
		() => parts.join('-'),
		[parts],
	)

	const isComplete = parts.every((p) => p.length === PART_LENGTH)

	const checkWhiteboardExists = async (id: string) => {
		try {
			const response = await fetch(`/api/whiteboard/${id}/exists`)
			const data = await response.json()
			setWhiteboardExists(Boolean(data.exists))
		} catch (error) {
			console.error('Error checking whiteboard existence:', error)
			setWhiteboardExists(false)
		} finally {
			setIsChecking(false)
		}
	}

	useEffect(() => {
		if (whiteboardId.length !== FULL_ID_LENGTH) {
			setIsChecking(false)
			setWhiteboardExists(false)
			return
		}

		setIsChecking(true)
		setWhiteboardExists(false)

		if (checkTimeoutRef.current) {
			clearTimeout(checkTimeoutRef.current)
		}

		checkTimeoutRef.current = setTimeout(() => {
			checkWhiteboardExists(whiteboardId)
		}, 500)

		return () => {
			if (checkTimeoutRef.current) {
				clearTimeout(checkTimeoutRef.current)
			}
		}
	}, [whiteboardId])

	const handleCreate = () => {
		navigate(`/${generateWhiteboardId()}`)
	}

	const handleJoin = () => {
		if (!whiteboardExists) return
		navigate(`/${whiteboardId}`)
	}

	const handleInputChange =
		(index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value.toUpperCase().slice(0, PART_LENGTH)

			setParts((prev) => {
				const next = [...prev]
				next[index] = value
				return next
			})

			if (value.length === PART_LENGTH) {
				inputRefs[index + 1]?.current?.focus()
			}
		}

	return (
		<div style={{ position: 'relative', height: '100vh' }}>
			<Tldraw store={store} />

			<div className="dialog-overlay">
				<div className="dialog">
					<div className="dialog-create-section">
						<button
							type="button"
							className="primary"
							onClick={handleCreate}
						>
							Start Drawing
						</button>
					</div>

					<div className="dialog-divider" />

					<h4>Join existing Whiteboard</h4>

					<div className="whiteboard-input-group">
						{parts.map((value, index) => (
							<>
								<input
									key={index}
									ref={inputRefs[index]}
									type="text"
									value={value}
									onChange={handleInputChange(index)}
									placeholder="ABC"
									maxLength={PART_LENGTH}
									autoFocus={index === 0}
								/>
								{index < 2 && <span>-</span>}
							</>
						))}
					</div>

					{isComplete && !isChecking && !whiteboardExists && (
						<div className="whiteboard-status-message">
							Whiteboard not found
						</div>
					)}

					<div className="dialog-buttons">
						<button
							type="button"
							className={`join-button ${
								whiteboardExists ? 'found' : ''
							}`}
							onClick={handleJoin}
							disabled={!whiteboardExists}
						>
							Join
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}