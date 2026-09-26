import './ProgramSelect.scss'

import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import { useEffect, useRef, useState } from 'react'
import ProgramSelectOption from './ProgramSelectOption'
import { createProgram, selectProgram } from '../../ApiClient'

const KEY_DOWN_ARROW_DOWN = 'ArrowDown'
const KEY_DOWN_ARROW_UP = 'ArrowUp'
const ProgramSelect = () => {
    const { program, programs, syncPrograms, currentProgramId } = useDmxButtonsContext()

    const lastProgramId = useRef(currentProgramId)
    const [showPicker, setShowPicker] = useState(false)

    const [editingProgramId, setEditingProgramId] = useState(undefined as number | undefined)

    const createProgramAndSync = async(name?: string) => {
        const newProgram = await createProgram({name: name || 'Nouveau'})
        await syncPrograms()
        selectProgram(newProgram.id)
    }
    const clickBackground = (e: any) => {
        if(e.target == e.currentTarget) {
            setShowPicker(false)
        }
    }

    const relativeProgramId = (index: number) => {
        return programs[Math.max(
            0,
            Math.min(
                programs.findIndex((p) => p.id == currentProgramId) + index,
                programs.length - 1
            )
        )].id
    }
    

    const handleKeyDown = (e: any) => {
        if(programs.length == 0) { return }
        
        if(e.code === KEY_DOWN_ARROW_DOWN) {
            selectProgram(relativeProgramId(1))
        }
        else if(e.code === KEY_DOWN_ARROW_UP) {
            selectProgram(relativeProgramId(-1))
        }
    }

    useEffect(() => {
        if(!showPicker) {
            setEditingProgramId(undefined)
        }
    }, [showPicker])

    useEffect(() => {
        if(lastProgramId.current != currentProgramId) {
            lastProgramId.current = currentProgramId
            setShowPicker(false)
        }
    }, [currentProgramId])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [program, programs, currentProgramId])
    return <>
            { program && <div
                className="current-program"
                onClick={() => setShowPicker(true)}>{program.id} | {program.name}
            </div> }
            { !program && <div
                className="current-program  "
                onClick={() => setShowPicker(true)}>
                Pick a program
            </div>}

            { showPicker && <div className="picker-background" onClick={clickBackground}>
                <div className={`picker ${editingProgramId ? 'editing' : 'not-editing'}`}>
                { programs.map((p) => <ProgramSelectOption
                    key={p.id}
                    program={p}
                    isEditing={editingProgramId == p.id}
                    setEditingProgramId={setEditingProgramId}/>)}        
                <div className='picker-option new-program' onClick={() => createProgramAndSync()}>Nouveau programme</div>
                
                </div>
                <div className='picker-bottom-shadow'/>
            </div>}
    </>
}

export default ProgramSelect