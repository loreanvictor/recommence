<img src="./logo-dark.svg#gh-dark-mode-only" height="24px"/>
<img src="./logo-light.svg#gh-light-mode-only" height="24px"/>

<br/>

long running workflows without magic:

```ts
import { workflow, step, sleep, hook, Engine } from 'recommence'

const fetchUserData = step(async (userId) => ...)
const sendVerificationEmail = step(async (data) => ...)
const markUserEmailAsVerified = step(async (userId, email) => ...)

const verifyEmail = workflow('email-verification', async (userId) => {
  const { name, email } = await fetchUserData(userId)
  const confirm = hook<boolean>()

  await sendVerificationEmail({ name, email, hook.token })

  const verified = await Promise.race([
    sleep('1 day'),
    confirm.once(),
  ])

  if (verified) {
    await markUserEmailAsVerified(userId, email)
  }
})

const engine = new Engine()
engine.run(() => verifyEmail('some-dude'))
```