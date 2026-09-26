import { deleteProgram, selectProgram, updateProgram } from '../../ApiClient'
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import './ProgramSelectOption.scss'
import { useEffect, useState } from "react"

interface Props {
    program: Program
    isEditing: boolean
    setEditingProgramId: (id: number | undefined) => void
}
const ProgramSelectOption = (props: Props) => {
    const { syncPrograms } = useDmxButtonsContext()
    const { program, isEditing, setEditingProgramId } = props

    const [name, setName] = useState(program.name)
    const [id, setId] = useState(program.id)
    const [bpm, setBpm] = useState(program.bpm)

    useEffect(() => {
        setName(program.name)
        setId(program.id)
        setBpm(program.bpm)
    }, [program])

    

    const updateProgramAndSync = (id: number, params: ProgramUpdateParams) => (
        updateProgram(id, params).then(syncPrograms)
    )
    

    const deleteProgramAndSync = (id: number) => deleteProgram(id).then(syncPrograms)

    const onSave = () => {
        setEditingProgramId(undefined)
        updateProgramAndSync(program.id, {id, name, bpm})
    }

    return <div
        className={`picker-option ${isEditing ? 'editing' : ''}`}>
            <input
                className='id'
                disabled={!isEditing}
                type="number"
                value={id}
                onChange={(e) => setId(parseInt(e.target.value, 10))}
                />
            <div className="separator"/>
            <input className='name'
                disabled={!isEditing}
                value={name}
                onChange={(e) => setName(e.target.value)}/>
            <div className="separator"/>
            <input
                className='bpm'
                disabled={!isEditing}
                type="number"
                placeholder="BPM"
                value={bpm ?? ''}
                onChange={(e) => setBpm(e.target.value ? parseInt(e.target.value, 10) : 60)}/>
            <div className="navigate-button" onClick={() => selectProgram(program.id)}/>
            <div className="edit-btn btn" onClick={() => setEditingProgramId(program.id)}>Edit</div>
            <div className="delete-btn btn" onClick={() => deleteProgramAndSync(program.id)}>Delete</div>
            <div className="save-btn btn" onClick={() => onSave()}>Save</div>
            <div className="blur-on-top"/>
    </div>
}
export default ProgramSelectOption