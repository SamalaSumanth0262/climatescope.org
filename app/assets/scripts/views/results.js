'use strict'
import React from 'react'
import { PropTypes as T } from 'prop-types'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import c from 'classnames'
import { StickyContainer, Sticky } from 'react-sticky'

import { environment } from '../config'
import { fetchPage } from '../redux/static-page'

import App from './app'
import { SliderControlGroup } from '../components/slider-controls'
import ResultsMap from '../components/results-map'
// import Share from '../components/share'

class Results extends React.Component {
  constructor (props) {
    super(props)

    // Bindings
    this.onWeightsResetClick = this.onWeightsResetClick.bind(this)
    this.onSliderGroupChange = this.onSliderGroupChange.bind(this)

    this.sliders = [
      {
        id: 'enabling-framework',
        name: 'Enabling framework',
        startingValue: 40
      },
      {
        id: 'financing',
        name: 'Financing & Investment',
        startingValue: 30
      },
      {
        id: 'val-chains',
        name: 'Value Chains',
        startingValue: 15
      },
      {
        id: 'ghg',
        name: 'GHG Management',
        startingValue: 15
      }
    ]

    this.state = {
      sliders: this.getInitialSliderState()
    }
  }

  getInitialSliderState () {
    return this.sliders.reduce((acc, v) => ({
      ...acc,
      [v.id]: {
        value: v.startingValue,
        locked: false
      }
    }), {})
  }

  onWeightsResetClick (e) {
    e.preventDefault()
    this.setState({
      sliders: this.getInitialSliderState()
    })
  }

  onSliderGroupChange (sliderValues) {
    this.setState({
      sliders: sliderValues
    })
  }

  renderHeaderFn ({ style, isSticky }) {
    const klass = c('layout--results__header', {
      'sticky': isSticky
    })

    return (
      <header id='parameters-controls' className={klass} style={style}>
        <div className='row--contained'>
          <div className='layout--results__heading'>
            <h1 className='layout--results__title'>
              <span>Results</span>
            </h1>
          </div>
          <div className='layout--results__tools'>
            {/* {% include actions_menu.html download_exc=true %} */}
          </div>
          <div className='layout--results__controls'>
            <div id='vis-controls' className='slider-group'>
              <h2 className='prime-title'>Calculate your own score</h2>
              <a href='#' className='reset' title='Reset topic weights' onClick={this.onWeightsResetClick}><span>Reset</span></a>

              <SliderControlGroup
                sliders={this.sliders}
                values={this.state.sliders}
                onChange={this.onSliderGroupChange}
              />

            </div>
          </div>
        </div>
      </header>
    )
  }

  render () {
    return (
      <App>
        <StickyContainer>
          <section className='layout--results' ng-app='globalApp'>
            <Sticky>
              {(props) => this.renderHeaderFn(props)}
            </Sticky>
            <div className='layout--results__body'>
              <ResultsMap />
            <div className='row--contained'>
                Table
              </div>
            </div>
          </section>
        </StickyContainer>
      </App>
    )
  }
}

if (environment !== 'production') {
  Results.propTypes = {
    fetchPage: T.func,
    match: T.object,
    page: T.object
  }
}

function mapStateToProps (state, props) {
  return {
  }
}

function dispatcher (dispatch) {
  return {
  }
}

export default connect(mapStateToProps, dispatcher)(Results)
