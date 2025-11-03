<br/>

<img src="./logo-dark.svg#gh-dark-mode-only" height="48px"/>
<img src="./logo-light.svg#gh-light-mode-only" height="48px"/>

<br/>

long running workflows without magic:

```ts
import { workflow, step, sleep, hook } from 'replayed'

const fetchUserData = step(async userid => ...)
const sendVerificationEmail = step(async (email, name, token) => ...)
const markEmailVerified = step(async (userid, email) => ...)

const verifyEmail = workflow('verify-email', async (userid, email) => {
  const { name } = await fetchUserData(userid)
  const confirm = hook()

  const approved = await Promise.race([
    sleep('1 day'),
    confirm.once(),
  ])

  if (approved) {
    await markEmailVerified(userid, email)
  }
})

```