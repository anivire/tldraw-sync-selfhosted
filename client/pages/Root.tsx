import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tldraw, createTLStore } from 'tldraw'

function generateWhiteboardId() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	const part = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
	return `${part()}-${part()}-${part()}`
}

export function Root() {
	const [part1, setPart1] = useState('')
	const [part2, setPart2] = useState('')
	const [part3, setPart3] = useState('')
	const [isChecking, setIsChecking] = useState(false)
	const [whiteboardExists, setWhiteboardExists] = useState(false)
	const navigate = useNavigate()
	const input2Ref = useRef<HTMLInputElement>(null)
	const input3Ref = useRef<HTMLInputElement>(null)
	const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const store = createTLStore()

	const checkWhiteboardExists = async (whiteboardId: string) => {
		try {
			const response = await fetch(`/api/whiteboard/${whiteboardId}/exists`)
			const data = await response.json()
			setWhiteboardExists(data.exists)
		} catch (error) {
			console.error('Error checking whiteboard existence:', error)
			setWhiteboardExists(false)
		} finally {
			setIsChecking(false)
		}
	}

	useEffect(() => {
		const whiteboardId = `${part1}${part2}${part3}`
		if (whiteboardId.length === 9) {
			setIsChecking(true)
			setWhiteboardExists(false)
			if (checkTimeoutRef.current) {
				clearTimeout(checkTimeoutRef.current)
			}
			checkTimeoutRef.current = setTimeout(() => {
				checkWhiteboardExists(whiteboardId)
			}, 500) // Debounce for 500ms
		} else {
			setIsChecking(false)
			setWhiteboardExists(false)
		}
	}, [part1, part2, part3])

	const handleCreate = () => {
		const newId = generateWhiteboardId()
		navigate(`/${newId}`)
	}

	const handleJoin = () => {
		if (whiteboardExists) {
			const whiteboardId = `${part1}-${part2}-${part3}`
			navigate(`/${whiteboardId}`)
		}
	}

	const handleInput1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.toUpperCase().slice(0, 3)
		setPart1(val)
		if (val.length === 3) input2Ref.current?.focus()
	}

	const handleInput2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.toUpperCase().slice(0, 3)
		setPart2(val)
		if (val.length === 3) input3Ref.current?.focus()
	}

	const handleInput3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.toUpperCase().slice(0, 3)
		setPart3(val)
	}

	return (
		<div style={{ position: 'relative', height: '100vh' }}>
			<Tldraw store={store} />
			<div className="dialog-overlay">
				<div className="dialog">
					<h2>Raccoon Whiteboard</h2>
					<div className="dialog-create-section">
						<button type="button" className="primary" onClick={handleCreate}>
							Start Drawing
						</button>
					</div>
					<div className="dialog-divider"></div>
					<h4>Join existing Whiteboard</h4>
					<div className="whiteboard-input-group">
						<input
							type="text"
							value={part1}
							onChange={handleInput1Change}
							placeholder="ABC"
							maxLength={3}
							autoFocus
						/>
						<span>-</span>
						<input
							type="text"
							ref={input2Ref}
							value={part2}
							onChange={handleInput2Change}
							placeholder="DEF"
							maxLength={3}
						/>
						<span>-</span>
						<input
							type="text"
							ref={input3Ref}
							value={part3}
							onChange={handleInput3Change}
							placeholder="XYZ"
							maxLength={3}
						/>
					</div>
					<div className="whiteboard-status-message">
						{!isChecking && !whiteboardExists && `${part1}${part2}${part3}`.length === 9 ? 'Whiteboard not found' : ''}
					</div>
					<div className="dialog-buttons">
						<button type="button" className={`join-button ${whiteboardExists ? 'found' : ''}`} onClick={handleJoin} disabled={!whiteboardExists}>
							Join
						</button>
					</div>
					<div className="dialog-divider"></div>
					<div className="dialog-disclaimer">
						<p>This self-hosted whiteboard, powered by tldraw, is intended for educational and internal use only. Data persistence is not guaranteed.</p>
					</div>
				</div>
			</div>
		</div>
	)
}
