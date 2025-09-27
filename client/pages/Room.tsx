import { useSync } from '@tldraw/sync'
import { ReactNode, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tldraw } from 'tldraw'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { multiplayerAssetStore } from '../multiplayerAssetStore'

export function Room() {
	const { whiteboardId } = useParams<{ whiteboardId: string }>()

	// Create a store connected to multiplayer.
	const store = useSync({
		// We need to know the websockets URI...
		uri: `${window.location.origin}/api/connect/${whiteboardId}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssetStore,
	})

	return (
		<WhiteboardWrapper whiteboardId={whiteboardId}>
			<Tldraw
				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				deepLinks
				onMount={(editor) => {
					// when the editor is ready, we need to register our bookmark unfurling service
					editor.registerExternalAssetHandler('url', getBookmarkPreview)
				}}
			/>
		</WhiteboardWrapper>
	)
}

function WhiteboardWrapper({ children, whiteboardId }: { children: ReactNode; whiteboardId?: string }) {
	const [didCopy, setDidCopy] = useState(false)
	const [isConnected, setIsConnected] = useState(true)
	const [showQRModal, setShowQRModal] = useState(false)
	const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; url: string } | null>(null)

	useEffect(() => {
		if (!didCopy) return
		const timeout = setTimeout(() => setDidCopy(false), 3000)
		return () => clearTimeout(timeout)
	}, [didCopy])

	// Check connection status periodically
	useEffect(() => {
		const checkConnection = async () => {
			try {
				const response = await fetch('/api/health')
				const data = await response.json()
				setIsConnected(data.mongodb === 'connected')
			} catch (error) {
				setIsConnected(false)
			}
		}

		checkConnection()
		const interval = setInterval(checkConnection, 30000) // Check every 30 seconds
		return () => clearInterval(interval)
	}, [])

	return (
		<div className="WhiteboardWrapper">
			<div className="WhiteboardWrapper-header">
				<ConnectionStatusIcon isConnected={isConnected} />
				<div className="WhiteboardWrapper-name-group">
					<div>{whiteboardId}</div>
					<div className="WhiteboardWrapper-buttons">
						<button
							className="WhiteboardWrapper-copy"
							onClick={() => {
								navigator.clipboard.writeText(window.location.href)
								setDidCopy(true)
							}}
							aria-label="copy whiteboard link"
						>
							Copy link
							{didCopy && <div className="WhiteboardWrapper-copied">Copied!</div>}
						</button>
						<button
							className="WhiteboardWrapper-qr"
							onClick={async () => {
								try {
									const response = await fetch(`/api/qrcode/${whiteboardId}`)
									const data = await response.json()
									setQrCodeData(data)
									setShowQRModal(true)
								} catch (error) {
									console.error('Failed to generate QR code:', error)
								}
							}}
							aria-label="show QR code"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								width={16}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125H19.125c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.875h.75v.75h-.75v-.75ZM19.875 13.5h.75v.75h-.75v-.75ZM19.875 19.875h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
								/>
							</svg>
						</button>
					</div>
				</div>
				<div className="WhiteboardWrapper-status">
					{!isConnected && <span className="status-disconnected">Disconnected - Changes not saving</span>}
				</div>
			</div>
			<div className="WhiteboardWrapper-content">{children}</div>
			<QRCodeModal 
				show={showQRModal} 
				onClose={() => setShowQRModal(false)} 
				qrCodeData={qrCodeData} 
			/>
		</div>
	)
}

function ConnectionStatusIcon({ isConnected }: { isConnected: boolean }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={16}
			className={isConnected ? 'status-connected' : 'status-disconnected'}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d={isConnected 
					? "M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
					: "M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
				}
			/>
		</svg>
	)
}

function QRCodeModal({ 
	show, 
	onClose, 
	qrCodeData 
}: { 
	show: boolean; 
	onClose: () => void; 
	qrCodeData: { qrCode: string; url: string } | null 
}) {
	if (!show || !qrCodeData) return null

	return (
		<div className="QRCodeModal-overlay" onClick={onClose}>
			<div className="QRCodeModal-content" onClick={(e) => e.stopPropagation()}>
				<div className="QRCodeModal-header">
					<h3>Scan QR Code to Join</h3>
					<button className="QRCodeModal-close" onClick={onClose} aria-label="close modal">
						×						
					</button>
				</div>
				<div className="QRCodeModal-body">
					<img src={qrCodeData.qrCode} alt="QR Code for whiteboard" />
					<p>Scan this QR code with your mobile device to join the whiteboard</p>
					<div className="QRCodeModal-url">
						<small>{qrCodeData.url}</small>
					</div>
				</div>
			</div>
		</div>
	)
}
