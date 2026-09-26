
export class InvalidParamError extends Error {}
export class NotFoundError extends Error {}


// export const validateUrlParam = (req: Request, key: string) => {
//       const param = req.params[key]
    
//       if (!param || typeof param !== "string") {
//         throw new InvalidParamError(`Invalid ${key} parameter`)
//       }
//       return param
//     }

// export const validateQueryParam = (req: Request, key: string) => {
//       const param = req.query[key]
    
//       if (!param || typeof param !== "string") {
//         throw new InvalidParamError(`Invalid ${key} parameter`)
//       }
//       return param
//     }


export const handleErrors = async(action: () => void) =>  {
    try {
        return JSON.parse(JSON.stringify(await action()))
    } catch (error) {
        if (error instanceof InvalidParamError) {
            return { error: error.message }
        }
        if (error instanceof NotFoundError) {
            return { error: error.message }
        }
        console.error(error);
        return { error: 'Unknown error' }
    }   
}
