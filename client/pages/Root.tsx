import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tldraw, createTLStore } from 'tldraw'

function generateRoomId() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	const part = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
	return `${part()}-${part()}-${part()}`
}

export function Root() {
	const [part1, setPart1] = useState('')
	const [part2, setPart2] = useState('')
	const [part3, setPart3] = useState('')
	const navigate = useNavigate()
	const input2Ref = useRef<HTMLInputElement>(null)
	const input3Ref = useRef<HTMLInputElement>(null)

	const store = createTLStore()

	const handleCreate = () => {
		const newId = generateRoomId()
		navigate(`/${newId}`)
	}

	const handleJoin = () => {
		if (part1.length === 3 && part2.length === 3 && part3.length === 3) {
			const roomId = `${part1}-${part2}-${part3}`
			navigate(`/${roomId}`)
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

	const canJoin = part1.length === 3 && part2.length === 3 && part3.length === 3

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
					<div className="room-input-group">
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
					<div className="dialog-buttons">
						<button type="button" onClick={handleJoin} disabled={!canJoin}>
							Join Whiteboard
						</button>
					</div>
					<div className="dialog-divider"></div>
					<div className="dialog-disclaimer">
						<p>1. This is a self-hosted whiteboard powered by tldraw, intended for educational and internal use only.</p>
						<p>2. Data persistence is not guaranteed.</p>
					</div>
				</div>
			</div>
		</div>
	)
}
