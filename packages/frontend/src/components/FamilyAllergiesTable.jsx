import React, { useEffect, useState } from 'react'
import { 
  Card,
  CardBody,
  Typography,
  Badge,
  Spinner
} from '@material-tailwind/react'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useFamilyStore } from '@/store/useFamilyGroupStore'

export const FamilyAllergiesTable = () => {
  const { allFamilyGroups, loading, error, fetchAllFamilyGroups } = useFamilyStore()
  const [filteredFamilies, setFilteredFamilies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAllFamilyGroups()
  }, [fetchAllFamilyGroups])

  useEffect(() => {
    if (allFamilyGroups) {
      let filtered = allFamilyGroups
      
      if (searchTerm) {
        filtered = allFamilyGroups.filter(family => 
          family.family_last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          family.family_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          family.food_allergies?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      setFilteredFamilies(filtered)
    }
  }, [allFamilyGroups, searchTerm])

  const hasAllergies = (allergies) => {
    return allergies && allergies.trim() !== '' && allergies.toLowerCase() !== 'none'
  }

  const getSeverityColor = (allergies) => {
    if (!hasAllergies(allergies)) return 'green'
    
    const allergyText = allergies.toLowerCase()
    if (allergyText.includes('severe') || allergyText.includes('anaphylaxis') || allergyText.includes('death')) {
      return 'red'
    } else if (allergyText.includes('moderate') || allergyText.includes('serious')) {
      return 'orange'
    } else {
      return 'yellow'
    }
  }

  const getSeverityLabel = (allergies) => {
    if (!hasAllergies(allergies)) return 'No Allergies'
    
    const allergyText = allergies.toLowerCase()
    if (allergyText.includes('severe') || allergyText.includes('anaphylaxis') || allergyText.includes('death')) {
      return 'Severe'
    } else if (allergyText.includes('moderate') || allergyText.includes('serious')) {
      return 'Moderate'
    } else {
      return 'Mild'
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody className="flex items-center justify-center p-8">
          <Spinner className="h-8 w-8" />
          <Typography className="ml-3">Loading family allergies...</Typography>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
            <Typography variant="h6" color="red">
              Error loading family allergies: {error}
            </Typography>
          </div>
        </CardBody>
      </Card>
    )
  }

  const familiesWithAllergies = filteredFamilies.filter(family => hasAllergies(family.food_allergies))
  const familiesWithoutAllergies = filteredFamilies.filter(family => !hasAllergies(family.food_allergies))

  const getFamilyLabel = (family) => {
    const base = family.family_last_name ? `The ${family.family_last_name} Family` : 'Unnamed Family'
    const hasDupe = (allFamilyGroups || []).filter(g => g.family_last_name === family.family_last_name).length > 1
    if (!hasDupe) return { name: base, detail: null }
    if (family.address) {
      const parts = family.address.split(',')
      const detail = parts.slice(-2).join(',').trim()
      return { name: base, detail }
    }
    return { name: base, detail: `#${family.id.slice(0, 4)}` }
  }

  return (
    <Card className="w-full">
      <CardBody className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <div>
            <Typography variant="h4" className="text-gray-900 dark:text-white mb-2">
              Family Allergies Overview
            </Typography>
            <Typography className="text-gray-600 dark:text-gray-400">
              Track food allergies and dietary restrictions across all family groups
            </Typography>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search families or allergies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">{filteredFamilies.length}</span>
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 mt-1 leading-tight">Total<br/>Families</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-red-900 dark:text-red-100">{familiesWithAllergies.length}</span>
            <span className="text-xs font-medium text-red-700 dark:text-red-300 mt-1 leading-tight">Have<br/>Allergies</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-green-900 dark:text-green-100">{familiesWithoutAllergies.length}</span>
            <span className="text-xs font-medium text-green-700 dark:text-green-300 mt-1 leading-tight">No<br/>Allergies</span>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {filteredFamilies.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">
              No families found matching your search criteria
            </p>
          ) : (
            filteredFamilies.map((family) => {
              const { name, detail } = getFamilyLabel(family)
              return (
              <div key={family.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div>
                  <Typography className="font-semibold text-gray-900 dark:text-white">
                    {name}
                  </Typography>
                  {detail && (
                    <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                      📍 {detail}
                    </Typography>
                  )}
                </div>
                <div>
                  {hasAllergies(family.food_allergies) ? (
                    <Typography variant="small" className="text-gray-900 dark:text-white">
                      <span className="font-medium">Allergies: </span>{family.food_allergies}
                    </Typography>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
                      <Typography variant="small" className="text-green-600 dark:text-green-400">No allergies</Typography>
                    </div>
                  )}
                </div>
                <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                  Updated: {family.last_modified
                    ? new Date(family.last_modified).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Unknown'}
                </Typography>
              </div>
            )})
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Family Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Allergies</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No families found matching your search criteria
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((family) => {
                  const { name, detail } = getFamilyLabel(family)
                  return (
                  <tr key={family.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <td className="px-6 py-4">
                      <Typography className="font-semibold text-gray-900 dark:text-white">
                        {name}
                      </Typography>
                      {detail && (
                        <Typography variant="small" className="text-gray-500 dark:text-gray-400">
                          📍 {detail}
                        </Typography>
                      )}
                      {family.family_first_name && (
                        <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                          {family.family_first_name}
                        </Typography>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasAllergies(family.food_allergies) ? (
                        <Typography className="text-gray-900 dark:text-white">{family.food_allergies}</Typography>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <Typography className="text-green-600 dark:text-green-400">No allergies</Typography>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                        {family.last_modified
                          ? new Date(family.last_modified).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'Unknown'}
                      </Typography>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        {/* Additional Information */}
        {familiesWithAllergies.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <Typography variant="h6" className="text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Important Notes
            </Typography>
            <Typography className="text-yellow-700 dark:text-yellow-300 text-sm">
              When hosting events, please be mindful of families with food allergies. 
              Consider providing allergen-free options and clearly labeling all food items.
            </Typography>
          </div>
        )}
      </CardBody>
    </Card>
  )
} 