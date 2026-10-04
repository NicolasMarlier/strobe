import { useEffect, useRef, useState } from 'react'

interface InlineInputProps {
    className: string
    initialValue: string
    type?: string
    onCommit: (value: string) => void
    onCancel: () => void
}

// Selected when it opens. Enter or leaving it saves, Escape cancels
const InlineInput = ({ className, initialValue, type = 'text', onCommit, onCancel }: InlineInputProps) => {
    const [value, setValue] = useState(initialValue)
    const ref = useRef<HTMLInputElement>(null)
    // Escape also blurs the field: that blur must not save
    const done = useRef(false)

    useEffect(() => ref.current?.select(), [])

    const commit = () => {
        if (done.current) return
        done.current = true
        onCommit(value)
    }

    return <input
        ref={ref}
        className={className}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
            // Keeps the app's shortcuts (Space to play, arrows to switch tracks…) out of the typing
            e.stopPropagation()
            if (e.key == 'Enter') commit()
            if (e.key == 'Escape') { done.current = true; onCancel() }
        }}
        onBlur={commit}/>
}

export default InlineInput
