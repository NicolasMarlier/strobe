import { useEffect, useRef, useState } from "react"
import SmallButton from "../DesignSystem/SmallButton/SmallButton"
import { BackToStartIcon, PauseIcon, PlayIcon } from "../DesignSystem/Icons"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { tickToTime, timeToTick } from "./utils"
import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { useDmxMidiContext } from "../../contexts/DmxMidiContext"
import { sendUsageSignal } from "../../ApiClient"
import { isTextField } from "../../useEditMenu"
import { trackEndTick, useAudioEndTick } from "./useTrackEndTick"

const AudioPlayer = () => {
    const { track, audioUrl } = useDmxButtonsContext()
    const { midiCurrentTickRef, sendCurrentTickToServer, seek, onSeek, drivenByMidi } = useRealTimeContext()
    const { setIsFollowing, isRecording, setIsRecording } = useDmxMidiContext()
    const [isPlaying, setIsPlaying] = useState(false)

    const isPlayingRef = useRef(isPlaying)
    isPlayingRef.current = isPlaying

    const audioRef = useRef<HTMLAudioElement>(null)

    const trackRef = useRef(track)
    trackRef.current = track

    // Playback stops at the track's end
    const endTickRef = useRef(0)
    endTickRef.current = trackEndTick(track, useAudioEndTick(track, audioUrl))

    // Without audio, or past its end, a clock moves the cursor: from this tick, since then
    const clockRef = useRef<{ startTick: number, startedAt: number } | null>(null)

    // Another track: playback stops
    useEffect(() => {
        pause()
        if (audioRef.current && !audioUrl) audioRef.current.src = ''
    }, [audioUrl, track?.id])

    // MainStage starts while the app plays: it takes over, the app's own playback stops.
    // MainStage stops: recording stops too, as with the app's own Pause
    const wasDrivenByMidiRef = useRef(drivenByMidi)
    useEffect(() => {
        if (drivenByMidi) pause()
        else if (wasDrivenByMidiRef.current) setIsRecording(false)
        wasDrivenByMidiRef.current = drivenByMidi
    }, [drivenByMidi])

    const pause = () => {
        audioRef.current?.pause()
        clockRef.current = null
        setIsPlaying(false)
    }

    // Pause, or the track's end: recording stops with playback
    const stop = () => {
        pause()
        setIsRecording(false)
    }

    // The audio plays from there when it has something to play there, else the clock goes
    const playFrom = (tick: number) => {
        const audio = audioRef.current
        const time = trackRef.current ? tickToTime(tick, trackRef.current.bpm) : 0
        if (audio && audioUrl && time < (audio.duration || 0)) {
            clockRef.current = null
            audio.currentTime = time
            // Paused before it really started (e.g. MainStage taking over): not an error
            audio.play().catch(() => { /* interrupted by pause() */ })
        }
        else {
            audio?.pause()
            clockRef.current = { startTick: tick, startedAt: performance.now() }
        }
    }

    const play = () => {
        if(!track || drivenByMidi) return

        // At the track's end: from the start again
        if(midiCurrentTickRef.current >= endTickRef.current) seek(0)
        playFrom(midiCurrentTickRef.current)
        setIsPlaying(true)
        setIsFollowing(true)
        sendUsageSignal('Strobe.playbackStarted')
    }


    const onRewindButton = () => seek(0)

    // Record starts playback, so that the cursor moves while recording. A frame later: with no room to
    // record at the cursor, the track editor turns recording off right away, and nothing plays
    const playRef = useRef(play)
    playRef.current = play
    const isRecordingRef = useRef(isRecording)
    isRecordingRef.current = isRecording
    useEffect(() => {
        if (!isRecording || isPlayingRef.current || drivenByMidi) return
        const frame = requestAnimationFrame(() => {
            if (isRecordingRef.current && !isPlayingRef.current) playRef.current()
        })
        return () => cancelAnimationFrame(frame)
    }, [isRecording])

    // The cursor moved by hand (a click in the timeline, the arrows, Back to Start): the audio goes
    // there too, so that playback carries on from it rather than bringing the cursor back
    const playFromRef = useRef(playFrom)
    playFromRef.current = playFrom
    useEffect(() => onSeek(tick => {
        if (isPlayingRef.current) playFromRef.current(tick)
        else if (audioRef.current && trackRef.current) {
            audioRef.current.currentTime = Math.max(0, tickToTime(tick, trackRef.current.bpm))
        }
    }), [])

    useEffect(() => {
        if(isPlaying && track) {
            const playbackInterval = setInterval(() => {
                const audio = audioRef.current
                // The audio over, the clock goes on from its end
                if (!clockRef.current && audio?.ended) {
                    clockRef.current = { startTick: timeToTick(audio.currentTime, track.bpm), startedAt: performance.now() }
                }
                const clock = clockRef.current
                const tick = clock
                    ? clock.startTick + timeToTick((performance.now() - clock.startedAt) / 1000, track.bpm)
                    : timeToTick(audio?.currentTime ?? 0, track.bpm)

                if (tick >= endTickRef.current) {
                    sendCurrentTickToServer(endTickRef.current)
                    stop()
                }
                else sendCurrentTickToServer(tick)
            }, 30)
            return () => clearInterval(playbackInterval)
        }
    }, [isPlaying])

    // Playback > Play / Pause and Back to Start: registered once, they call the latest play, pause and rewind.
    // On macOS, a key the page doesn't take goes on to the menu: Space and Return typed in a text field
    // land here too, and are the field's
    const menuActionsRef = useRef({ toggle: () => { /* set below */ }, rewind: () => { /* set below */ } })
    menuActionsRef.current = {
        toggle: () => { if (!drivenByMidi && !isTextField(document.activeElement)) (isPlaying ? stop : play)() },
        rewind: () => { if (!isTextField(document.activeElement)) onRewindButton() },
    }
    useEffect(() => {
        const unsubscribes = [
            window.strobe.api.onMessage('playback:toggle', () => menuActionsRef.current.toggle()),
            window.strobe.api.onMessage('playback:rewind', () => menuActionsRef.current.rewind()),
        ]
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key != ' ' || isTextField(document.activeElement)) return
        // Taken here, so that macOS doesn't pass it on to Playback > Play / Pause, which would toggle again
        e.preventDefault()
        // Holding Space repeats the key: only its first press toggles. Through the ref, so that it plays the
        // track selected since, like the button
        if(!e.repeat) menuActionsRef.current.toggle()
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [])

    const drivenTitle = drivenByMidi ? 'Playback is driven by MainStage' : undefined

    return <>
        <audio
            ref={audioRef}
            src={audioUrl}/>
        <SmallButton
            value={isPlaying}
            title={drivenTitle ?? (isPlaying ? 'Pause (Space)' : 'Play (Space)')}
            onClick={() => {(isPlaying ? stop : play)() }}
            disabled={drivenByMidi}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            title={drivenTitle ?? 'Back to Start (Return)'}
            onClick={onRewindButton}
            disabled={drivenByMidi}>
            <BackToStartIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer