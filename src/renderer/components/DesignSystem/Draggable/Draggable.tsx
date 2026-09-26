import './Draggable.scss'
import { useState, type ReactNode } from "react"

interface Props {
    children: ReactNode
    className?: string
    onDropFile: (file: File) => void
}
const Draggable = (props: Props) => {
    const { children, onDropFile, className } = props
    const [isDraggingAudio, setIsDraggingAudio] = useState(false)
    

    const onDragOver = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDraggingAudio(true)
    }
    
    const onDragLeave = () => setIsDraggingAudio(false)

    const onDrop = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDraggingAudio(false)
        const file = event.dataTransfer.files[0]
        if(file && onDropFile) onDropFile(file)
    }

    return <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`${className} draggable ${isDraggingAudio ? 'drag-over' : ''}`}>
            { children }
        
    </div>
}
export default Draggable