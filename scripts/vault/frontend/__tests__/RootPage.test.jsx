import { redirect } from 'next/navigation'
import Root from '../app/page'

jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

describe('Root page', () => {
  it('redirects to /login', () => {
    Root()
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})
