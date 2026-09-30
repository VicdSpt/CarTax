import { render, screen } from '@testing-library/react'
import VehicleForm from '@/components/VehicleForm'

describe('VehicleForm — état de chargement', () => {
  it('affiche un spinner et désactive le bouton pendant le calcul', () => {
    render(<VehicleForm onSubmit={() => {}} loading />)

    const button = screen.getByRole('button', { name: /calcul en cours/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('submit-spinner')).toBeInTheDocument()
  })

  it('n’affiche pas de spinner hors chargement', () => {
    render(<VehicleForm onSubmit={() => {}} />)

    const button = screen.getByRole('button', { name: /calculer mes taxes/i })
    expect(button).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByTestId('submit-spinner')).not.toBeInTheDocument()
  })
})
