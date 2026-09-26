import { useEffect, useRef, useState } from "react"
import SmallButton from "../DesignSystem/SmallButton/SmallButton"
import { BackToStartIcon, PauseIcon, PlayIcon } from "../DesignSystem/Icons"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { tickToTime, timeToTick } from "./utils"
import { useRealTimeContext } from "../../contexts/RealTimeContext"

const AudioPlayer = () => {
    const { program, audioUrl } = useDmxButtonsContext()
    const { midiCurrentTickRef, sendCurrentTickToServer } = useRealTimeContext()
    const [isPlaying, setIsPlaying] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        if (!audioRef.current) return
        audioRef.current.pause()
        setIsPlaying(false)
        if (!audioUrl) audioRef.current.src = ''
    }, [audioUrl])

    const pause = () => {
        if(!audioRef.current) return 
        audioRef.current.pause()
        setIsPlaying(false)
    }

    const play = () => {
        if(!audioRef.current) return

        if(program) {
            audioRef.current.currentTime = tickToTime(midiCurrentTickRef.current, program.bpm)
        }
        audioRef.current.play()
        setIsPlaying(true)
    }


    const onRewindButton = () => {
        if(!audioRef.current) return 
        audioRef.current.currentTime = 0
        sendCurrentTickToServer(0)
    }

    useEffect(() => {
        if(isPlaying && program) {
            const audioInterval = setInterval(() => {
                if(audioRef.current) {
                    sendCurrentTickToServer(timeToTick(audioRef.current.currentTime, program.bpm))
                }
            }, 30)
            return () => clearInterval(audioInterval)
        }
    }, [isPlaying])

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key == ' ') (isPlaying ? pause : play)()
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [isPlaying])

    return <>
        <audio
            ref={audioRef}
            src={audioUrl}/>
        <SmallButton
            value={isPlaying}
            onClick={() => {(isPlaying ? pause : play)() }}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            onClick={onRewindButton}
            disabled={isPlaying}>
            <BackToStartIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer