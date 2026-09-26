import "react"
import { useDmxButtonsContext } from "../contexts/DmxButtonsContext"

const App = () => {

    const { programs } = useDmxButtonsContext()

    return <>
        <p>YO, sup?</p>
        { programs.map((program) => 
            <li key={program.id}>{program.name}</li>
        )}
    </>
}

export default App