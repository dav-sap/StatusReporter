import React, { Component } from 'react';
import {STATUS} from './../Consts';
import Status from './Status'
import {addErrorNoti} from './../Utils';
import './where-info.css';
import {Link } from 'react-router-dom';
import AppStoreInstance from "../AppStore";
import {addNotification} from "../Utils";
import {COLOR_MAP} from "../Consts";
import LoadingCircle from "../LoadingCircle";
const TODAY = "today";
const TOMORROW = "tomorrow";
const IdbKeyval = require('idb-keyval');

export default class WhereInfo extends Component {
    state = {
        today: {
            ooo: [],
            wf: [],
            arriving: [],
        },
        tomorrow: {
            ooo: [],
            wf: [],
            arriving: [],
        },
        day: TODAY,
        loading: false,
        user: null,
        heightNeeded: null,

    };
    updateDatesInterval = null;
    heightToFill = null;
    lineHeight = 40;

    parseReports(reports, stateToUpdate) {
        let ooo = [];
        let oooNames = [];
        let wf = [];
        let wfNames = [] ;
        let arriving = [];
        let arrivingNames = [];

        reports.forEach((report) => {
            switch (report.status) {
                case "OOO":
                    if (oooNames.indexOf(report.name) === -1) {
                        ooo.push(report);
                        oooNames.push(report.name)
                    }
                    break;
                case "WF":
                    if (wfNames.indexOf(report.name) === -1) {
                        wf.push(report);
                        wfNames.push(report.name);
                    }
                    break;
                case STATUS.ARRIVING:
                    if (arrivingNames.indexOf(report.name) === -1) {
                        arriving.push(report);
                        arrivingNames.push(report.name);
                    }
                    break;
                default:
                    console.log("No matching Status")
            }
        })
        if (stateToUpdate === TODAY) {
            this.setState({today : {ooo: ooo, wf:wf, arriving: arriving}, loading: false});

        }
        if (stateToUpdate === TOMORROW) {
            this.setState({tomorrow : {ooo: ooo, wf:wf, arriving: arriving}});
        }
        if (stateToUpdate === this.state.day) {
            this.setState({
                heightNeeded: this.lineHeight * (ooo.length + wf.length + (arriving.length / 2))
            });
        }
    }

    fetchMembers = async (stateToUpdate, date) => {
        try {
            let today = date;
            let reqProps = {
                method: 'GET',
                headers: new Headers({
                    'content-type': 'application/json',
                    'user': this.state.user.email + ":" + this.state.user.password
                }),
            };

            let response = await fetch("/get_members_status_by_date?date=" + today, reqProps);
            if (response.status === 200) {
                let resJson = await response.json();
                this.parseReports(resJson.reports, stateToUpdate);

            } else if (response.status === 401) {
                addNotification("No group, please sign up to a group");
            }
            else {
                addErrorNoti();
            }

        } catch (e) {
            this.setState({loading: false});
            addErrorNoti();
        }
    };
    updateDates = async (showLoading) => {
        this.setState({loading: showLoading});
        let today = new Date();
        today.setTime(today.getTime() + ((-1*today.getTimezoneOffset())*60*1000));
        await this.fetchMembers(TODAY, today.toISOString());
        let tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await this.fetchMembers(TOMORROW, tomorrow.toISOString());
    }
    calculateScreenHeight() {
        let w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            y = w.innerHeight || e.clientHeight || g.clientHeight;
        let topHeight = d.getElementsByClassName("title-where-text")[0].offsetHeight;
        let bottomHeight = d.getElementsByClassName("bottom-button-wrapper")[0].offsetHeight + 15;
        let middleHeight = 0;
        let middleMargin = 45;
        let titleList = d.getElementsByClassName("status-where-title");
        Array.prototype.forEach.call(titleList, (el) => {
            middleHeight += el.offsetHeight;
        });
        let windowMinHeight = 480;
        y = y < windowMinHeight ? windowMinHeight : y;
        this.heightToFill = y - topHeight - middleHeight - bottomHeight - middleMargin;
    }
    async componentDidMount() {
        this.calculateScreenHeight();
        AppStoreInstance.resetAll();
        let user = await IdbKeyval.get('user');
        if (user && user.email) {
            AppStoreInstance.updateUser(user);
            await this.setState({user: user});
            this.updateDates(true);
            this.updateDatesInterval = setInterval(() => this.updateDates(), 12000);
        } else {
            addNotification("No group, please sign up to a group");
        }
    }

    componentWillUpdate(nextProps, nextState) {
        this.calculateScreenHeight();
    }

    componentWillUnmount() {
        clearInterval(this.updateDatesInterval);
    }
    switchDay = (day) => {
        const heightNeeded = this.lineHeight * (this.state[day].ooo.length + this.state[day].wf.length + (this.state[day].arriving.length / 2));
        this.setState({day: day, heightNeeded: heightNeeded})
    }
    render() {
        let heightSpare = this.heightToFill - this.state.heightNeeded;
        let oooLength = this.state[this.state.day].ooo.length;
        let wfLength = this.state[this.state.day].wf.length;
        let arrivingLength = Math.ceil(this.state[this.state.day].arriving.length / 2);
        let heightToRemoveOOO = 0, heightToRemoveWF = 0, heightToRemoveArriving = 0;
        if (heightSpare < 0) {
            heightSpare = Math.abs(heightSpare);
            let heightFactor = heightSpare / ( oooLength+ wfLength + arrivingLength);
            heightToRemoveOOO = oooLength * heightFactor;
            heightToRemoveWF = wfLength * heightFactor;
            heightToRemoveArriving = arrivingLength * heightFactor;
        }

        return (
            <div className="where-wrapper">
                {this.state.loading ? <LoadingCircle/>: ""}
                {this.state.loading ? <div className="cover-div where-info-cover"/> : ""}
                <div className="where-info">
                    <Link to="/"><i className="prev-arrow"/></Link>
                    <div className="title-where-text">Where is Everyone?</div>
                    <Status key={0} title={"Out Of Office"} color={COLOR_MAP[STATUS.OOO]} height={Math.floor(this.lineHeight * oooLength - heightToRemoveOOO)} reports={this.state[this.state.day].ooo}/>
                    <Status key={1} title={"Working From"} color={COLOR_MAP[STATUS.WF]} height={Math.floor(this.lineHeight * wfLength - heightToRemoveWF)} reports={this.state[this.state.day].wf} />
                    <Status key={2} title={STATUS.ARRIVING} color={COLOR_MAP[STATUS.ARRIVING]} height={Math.floor(this.lineHeight * arrivingLength - heightToRemoveArriving)} reports={this.state[this.state.day].arriving} />
                    <div className="flex-row bottom-button-wrapper">
                        <div className={this.state.day === TODAY ? "day-button-clicked" : "day-button"} onClick={() => this.switchDay(TODAY)} >
                            Today
                        </div>
                        <div className={this.state.day === TOMORROW ? "day-button-clicked" : "day-button"} onClick={() => this.switchDay(TOMORROW)} >
                            Tomorrow
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}