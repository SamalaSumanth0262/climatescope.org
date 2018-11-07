'use strict'
import React from 'react'
import { PropTypes as T } from 'prop-types'
import c from 'classnames'
import ScrollableAnchor from 'react-scrollable-anchor'

import { environment } from '../config'
import AreaChart, { memoizedComputeAreaChartData } from './area-chart'

// /////////////////////////////////////////////////////////////////////////////
// React Components
// /////////////////////////////////////////////////////////////////////////////

// Containers to have a named wrapper.
export const AreaAlpha = ({ children }) => children
export const AreaBeta = ({ children }) => children

/**
 * Parameter section with a Scrollable Anchor and two content sections.
 *
 * @param {string} id The section id for the ScrollableAnchor
 * @param {string} type The type of section (linear|split). Used to construct
 *                      the class `par-section--${type}`
 * @param {node} children Children for each section using the components
 *                        <AreaAlpha /> and <AreaBeta />.
 */
export const ParSection = ({ id, type, children }) => {
  const ch = React.Children.toArray(children)
  const alphaChild = ch.find(c => c.type === AreaAlpha)
  const betaChild = ch.find(c => c.type === AreaBeta)

  return (
    <ScrollableAnchor id={id}>
      <section className={c('par-section', {
        [`par-section--${type}`]: !!type
      })}>
        <div className='par-section__contents'>
          {alphaChild && <div className='area-alpha'>{alphaChild}</div>}
          {betaChild && <div className='area-beta'>{betaChild}</div>}
        </div>
      </section>
    </ScrollableAnchor>
  )
}

if (environment !== 'production') {
  ParSection.propTypes = {
    id: T.string,
    type: T.string,
    children: T.node
  }
}

/**
 * Parameter section header with a title and a description.
 *
 * @param {string} title The header title.
 * @param {string} description The header description.
 */
export const ParSectionHeader = ({ title, description }) => (
  <header className='par-section__header'>
    <h1 className='par-section__title'>{title}</h1>
    <div className='par-section__description'>
      <p>{description}</p>
    </div>
  </header>
)

if (environment !== 'production') {
  ParSectionHeader.propTypes = {
    title: T.string,
    description: T.string
  }
}

/**
 * Parameter card.
 *
 * @param {string} title The title of the card. Used interchangeably
 *                       with `hiddenTitle`.
 * @param {string} hiddenTitle The hidden title of the card. Used interchangeably
 *                       with `title`. When used the h1 will be visually hidden.
 * @param {string} description The card statement.
 * @param {string} size The size of the card (small|medium|large). Used to
 *                      construct the class `info-card--${size}`.
 * @param {string} theme The theme of the card (light|dark). Used to
 *                      construct the class `info-card--${theme}`.
 * @param {node} children Content of the card.
 */
export const ParCard = ({ title, hiddenTitle, description, size, theme, children }) => (
  <article className={c('info-card', {
    [`info-card--${size}`]: !!size,
    [`info-card--${theme}`]: !!theme
  })}>
    <h1 className={c('info-card__title', { 'visually-hidden': hiddenTitle })}>{title || hiddenTitle}</h1>
    {description ? (
      <div className='info-card__statement'>
        <p>{description}</p>
      </div>
    ) : null }
    {children}
  </article>
)

if (environment !== 'production') {
  ParCard.propTypes = {
    title: T.string,
    hiddenTitle: T.string,
    description: T.string,
    size: T.string,
    theme: T.string,
    children: T.node
  }
}

// /////////////////////////////////////////////////////////////////////////////
// Layout render functions
// /////////////////////////////////////////////////////////////////////////////

/**
 * Renders the specified parameter section
 *
 * @param {string} area Area to render (alpha|beta)
 * @param {object} sectionDef Definition of the section being rendered.
 * @param {object} chartsMeta Definition of all charts.
 * @param {array} chartsData Chart data
 * @param {react} reactComponent The react component. Needed for the interative
 *                               charts that need access to the state and other
 *                               functions.
 */
export const renderParArea = (area, sectionDef, chartsMeta, chartsData, reactComponent) => {
  if (['alpha', 'beta'].indexOf(area) === -1) return null

  const AreaElement = area === 'alpha' ? AreaAlpha : AreaBeta
  const key = area === 'alpha' ? 'areaAlpha' : 'areaBeta'

  // If there's nothing in the area, don't render it.
  if (!sectionDef[key].length) return null

  const areaContents = sectionDef[key].map(el => {
    // Section headers are considered special elements.
    if (el.id === 'sectionHeader') {
      return (
        <ParSectionHeader
          key={el.id}
          title={sectionDef.title}
          description='Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
        />
      )
    }

    try {
      const [chartDef] = getChartDef(chartsMeta, el.id)

      // Group elements mut be handled differently.
      if (chartDef.type === 'group') {
        // Get all children.
        const chartDefChildren = getChartDef(chartsMeta, chartDef.children, el.id)
        // Unique children types.
        const uniqueTypes = chartDefChildren.reduce((acc, def) => (
          acc.indexOf(def.type) === -1 ? acc.concat(def.type) : acc
        ), [])

        if (uniqueTypes.length !== 1) {
          throw new Error(`All the indicators of group [${chartDef.id}] must be of same type. Types found: [${uniqueTypes.join(', ')}]`)
        }

        // Get the chart group data.
        const [chartGroupData] = getChartData(chartsData, chartDef.id)

        // Reconcile the data of the children.
        let childrenWithoutData = []
        const reconciledChildren = chartDefChildren.map(child => {
          try {
            // TODO: Change the approach to get the data. Show get the data
            // from the global definition, not the children.
            const [d] = getChartData(chartGroupData.data, child.id, chartDef.id)
            return { ...child, data: d }
          } catch (error) {
            childrenWithoutData = childrenWithoutData.concat(error.data)
          }
        })

        // Children with no data.
        if (childrenWithoutData.length) {
          throw new Error(`Data not found for chart [${childrenWithoutData.join(', ')}] in group [${chartDef.id}]`)
        }

        // Reconcile the data of the group and children.
        const reconciledData = {
          ...chartDef,
          ...chartGroupData,
          size: el.size,
          children: reconciledChildren
        }

        // Children are all the same type. Render based off of that
        switch (uniqueTypes[0]) {
          case 'answer':
            return renderParCardAnswerGroup(reconciledData)
          default:
            console.warn(`Unable to render children type [${uniqueTypes[0]}] for chart group [${chartDef.id}]`)
            throw new Error(`Unable to render children type [${uniqueTypes[0]}] for chart group [${chartDef.id}]`)
        }
      } else {
        const [chartData] = getChartDef(chartsData, el.id)

        // Reconcile chart data, i.e. merge all in an object.
        const reconciledData = {
          ...chartDef,
          data: chartData,
          size: el.size
        }

        switch (reconciledData.type) {
          case 'answer':
            return renderParCardAnswer(reconciledData)
          case 'timeSeries':
            return renderParCardTimeSeries(reconciledData, reactComponent)
          default:
            console.warn(`Unable to render chart type [${reconciledData.type}] for chart [${reconciledData.id}]`)
            throw new Error(`Unable to render chart type [${reconciledData.type}] for chart [${reconciledData.id}]`)
        }
      }
    } catch (error) {
      return renderParCardError(el, error.message)
    }
  })

  return (
    <AreaElement>
      {areaContents}
    </AreaElement>
  )
}

// /////////////////////////////////////////////////////////////////////////////
// Types of chart cards
// /////////////////////////////////////////////////////////////////////////////

/**
 * Renders an error card.
 *
 * @param {object} chart Chart data.
 * @param {string} error The error to display.
 */
const renderParCardError = (chart, error) => {
  return (
    <ParCard
      key={chart.id}
      size={chart.size}
      title='Chart error'
      description={error}
      theme={'light'} />
  )
}

/**
 * Renders an "answer" card type.
 *
 * @param {object} chart Chart data
 */
const renderParCardAnswer = (chart) => {
  const answer = chart.data.value.toString()
  return (
    <ParCard
      key={chart.id}
      title={chart.name}
      description={chart.description || null}
      size={chart.size}
      theme={'light'}>

      <dl className='card-answer-options'>
        {chart.options.map(opt => (
          <React.Fragment key={opt.id}>
            <dt className={c({ 'answer-checked': opt.id === answer, 'answer-unchecked': opt.id !== answer })}>{opt.label}</dt>
            <dd>{opt.id === answer ? 'Checked' : 'Unchecked'}</dd>
          </React.Fragment>
        ))}
      </dl>
    </ParCard>
  )
}

/**
 * Renders an "timeSeries" card type.
 *
 * @param {object} chart Chart data
 * @param {react} reactComponent The react component. Needed for the interative
 *                               charts that need access to the state and other
 *                               functions.
 */
const renderParCardTimeSeries = (chart, reactComponent) => {
  const renewableTypes = [
    'Biomass & Waste',
    'Geothermal',
    'Small Hydro',
    'Solar',
    'Wind'
  ]
  // Chart id works as a cache key because the data is never going to be
  // updated. If in the future this changes then the cache key needs to
  // be dynamic.
  const chartData = memoizedComputeAreaChartData(chart.data, renewableTypes, chart.id)
  return (
    <ParCard
      key={chart.id}
      title={chart.name}
      size={chart.size}
    >
      <AreaChart
        onBisectorEvent={reactComponent.onInteractionEvent.bind(reactComponent, chart.id)}
        interactionData={reactComponent.state[chart.id]}
        xLabel={chartData.xLabel}
        yLabel={chartData.yLabel}
        yDomain={chartData.yDomain}
        xDomain={chartData.xDomain}
        data={chartData.data}
      />
    </ParCard>
  )
}

/**
 * Renders an group of "answer" card type.
 *
 * @param {object} chart Chart data
 */
const renderParCardAnswerGroup = (chart) => {
  const options = chart.children.reduce((acc, child) => {
    return child.options.reduce((acc2, opt) => {
      return acc2.indexOf(opt.label) === -1 ? acc2.concat(opt.label) : acc2
    }, acc)
  }, [])

  return (
    <ParCard
      key={chart.id}
      hiddenTitle={chart.name}
      size={chart.size}>

      <table className='feature-table'>
        <thead>
          <tr>
            <th><span className='visually-hidden'>Feature</span></th>
            {options.map(o => <th key={o}>{o}</th>)}
          </tr>
        </thead>
        <tbody>
          {chart.children.map(child => {
            // The label for this child value. We can't use ids because they're
            // not consisten.
            const dataOptLabel = child.options.find(opt => opt.id === child.data.value.toString()).label
            return (
              <tr key={child.id}>
                <th>
                  <h2>{child.name}</h2>
                  <p>{child.description}</p>
                </th>
                {options.map(o => (
                  <td key={o}>
                    <strong className={c({ 'feature-checked': o === dataOptLabel, 'feature-unchecked': o !== dataOptLabel })}><span>{o === dataOptLabel ? 'Checked' : 'Unchecked'}</span></strong>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

    </ParCard>
  )
}

// /////////////////////////////////////////////////////////////////////////////
// Utils functions
// /////////////////////////////////////////////////////////////////////////////

/**
 * Gets the objects that match the given ids.
 * Throws an error if any id is missing.
 *
 * @throws Error
 *
 * @param {array} arr The array from which to get the data. Assumes every object
 *                    has an `id` property.
 * @param {array|string} ids Ids to search for.
 *
 * @returns array
 */
const getFromArray = (arr, ids) => {
  ids = [].concat(ids)
  const found = arr.filter(o => ids.indexOf(o.id) !== -1)
  // If all good.
  if (found.length === ids.length) return found

  const missingIds = ids.filter(id => !found.find(f => f.id === id))
  const err = new Error('Missing ids')
  err.data = missingIds
  throw err
}

/**
 * Same as getFromArray() but with an error message customized for
 * chart definition data.
 *
 * @see getFromArray()
 * @throws Error
 *
 * @param {array} arr The array from which to get the data. Assumes every object
 *                    has an `id` property.
 * @param {array|string} ids Ids to search for.
 * @param {string} groupId (optional) Id of the chart group the data is for,
 *                         if any.
 *
 * @returns array
 */
const getChartDef = (arr, ids, groupId) => {
  try {
    return getFromArray(arr, ids)
  } catch (error) {
    error.message = `Definition not found for chart [${error.data.join(', ')}]` + (groupId ? ` in group [${groupId}]` : '')
    throw error
  }
}

/**
 * Same as getFromArray() but with an error message customized for
 * chart data.
 *
 * @see getFromArray()
 * @throws Error
 *
 * @param {array} arr The array from which to get the data. Assumes every object
 *                    has an `id` property.
 * @param {array|string} ids Ids to search for.
 * @param {string} groupId (optional) Id of the chart group the data is for,
 *                         if any.
 *
 * @returns array
 */
const getChartData = (arr, ids, groupId) => {
  try {
    return getFromArray(arr, ids)
  } catch (error) {
    error.message = `Data not found for chart [${error.data.join(', ')}]` + (groupId ? ` in group [${groupId}]` : '')
    throw error
  }
}
