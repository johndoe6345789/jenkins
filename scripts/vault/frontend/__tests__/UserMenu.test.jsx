import { screen, fireEvent } from '@testing-library/react'
import { renderWithStore } from './utils'
import { UserMenu } from '../components/UserMenu'

const onLogout = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('UserMenu', () => {
  it('renders the avatar with initial V', () => {
    renderWithStore(<UserMenu onLogout={onLogout} />)
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('menu is closed initially', () => {
    renderWithStore(<UserMenu onLogout={onLogout} />)
    expect(screen.queryByText('Log out')).not.toBeInTheDocument()
  })

  it('opens dropdown on avatar click', () => {
    renderWithStore(<UserMenu onLogout={onLogout} />)
    fireEvent.click(screen.getByText('V'))
    expect(screen.getByText('Log out')).toBeInTheDocument()
  })

  it('calls onLogout when Log out is clicked', () => {
    renderWithStore(<UserMenu onLogout={onLogout} />)
    fireEvent.click(screen.getByText('V'))
    fireEvent.click(screen.getByText('Log out'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
