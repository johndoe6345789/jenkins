'use client'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import i18n from '../lib/i18n'
import { setLanguage } from '../lib/uiSlice'
import { useAppDispatch, useAppSelector } from '../lib/store'

export function LanguageSelector() {
  const dispatch = useAppDispatch()
  const language = useAppSelector(state => state.ui.language)

  const handleChange = (e: SelectChangeEvent) => {
    dispatch(setLanguage(e.target.value))
    i18n.changeLanguage(e.target.value)
  }

  return (
    <Select
      value={language}
      onChange={handleChange}
      size="small" variant="outlined"
      sx={{ minWidth: 64, fontSize: 12 }}
      inputProps={{ 'data-testid': 'lang-select' }}
    >
      <MenuItem value="en">EN</MenuItem>
      <MenuItem value="fr">FR</MenuItem>
      <MenuItem value="nl">NL</MenuItem>
      <MenuItem value="es">ES</MenuItem>
      <MenuItem value="cy">CY</MenuItem>
    </Select>
  )
}
