import { render, screen } from '@testing-library/react'
import { ToastList } from '../components/Toast'

describe('ToastList', () => {
  it('renders nothing with empty toasts', () => {
    const { container } = render(<ToastList toasts={[]} />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('renders a success toast', () => {
    render(<ToastList toasts={[{ id: 1, msg: 'Done!', type: 'success' }]} />)
    expect(screen.getByText('Done!')).toBeInTheDocument()
  })

  it('renders an error toast', () => {
    render(<ToastList toasts={[{ id: 2, msg: 'Oops', type: 'error' }]} />)
    expect(screen.getByText('Oops')).toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    const toasts = [
      { id: 1, msg: 'One', type: 'success' },
      { id: 2, msg: 'Two', type: 'error' },
    ]
    render(<ToastList toasts={toasts} />)
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
  })
})
