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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardBody className="p-4">
              <Typography variant="h6" className="text-blue-800 dark:text-blue-200 mb-1">
                Total Families
              </Typography>
              <Typography variant="h4" className="text-blue-900 dark:text-blue-100 font-bold">
                {filteredFamilies.length}
              </Typography>
            </CardBody>
          </Card>
          
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardBody className="p-4">
              <Typography variant="h6" className="text-red-800 dark:text-red-200 mb-1">
                Families with Allergies
              </Typography>
              <Typography variant="h4" className="text-red-900 dark:text-red-100 font-bold">
                {familiesWithAllergies.length}
              </Typography>
            </CardBody>
          </Card>
          
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardBody className="p-4">
              <Typography variant="h6" className="text-green-800 dark:text-green-200 mb-1">
                No Allergies
              </Typography>
              <Typography variant="h4" className="text-green-900 dark:text-green-100 font-bold">
                {familiesWithoutAllergies.length}
              </Typography>
            </CardBody>
          </Card>
        </div>

        {/* Allergies Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                  Family Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                  Allergies
                </th>
               
              
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No families found matching your search criteria
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((family) => (
                  <tr key={family.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Typography className="font-semibold text-gray-900 dark:text-white">
                          {family.family_last_name ? `The ${family.family_last_name} Family` : 'Unnamed Family'}
                        </Typography>
                        {family.family_first_name && (
                          <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                            {family.family_first_name}
                          </Typography>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {hasAllergies(family.food_allergies) ? (
                        <div className="max-w-xs">
                          <Typography className="text-gray-900 dark:text-white">
                            {family.food_allergies}
                          </Typography>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <Typography className="text-green-600 dark:text-green-400">
                            No allergies
                          </Typography>
                        </div>
                      )}
                    </td>
                    
                 
                    
                   
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Typography variant="small" className="text-gray-600 dark:text-gray-400">
                        {family.last_modified ? 
                          new Date(family.last_modified).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 
                          'Unknown'
                        }
                      </Typography>
                    </td>
                  </tr>
                ))
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