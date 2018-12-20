var prizeListMock = [
  {
    id: 1,
    index: 0,
    name: '奖品一',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },
  {
    id: 2,
    index: 1,
    name: '奖品二',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },
  {
    id: 3,
    index: 2,
    name: '奖品三',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },
  {
    id: 4,
    index: 3,
    name: '奖品四',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },
  {
    id: 5,
    index: 4,
    name: '奖品五',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },
  {
    id: 6,
    index: 4,
    name: '奖品六',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },
  {
    id: 7,
    index: 4,
    name: '奖品七',
    thumb: '/assets/images/icon/icon_wallet.png',
    probability: 12.5,
  },

];
var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue!',
    isShowResultModal: false,
    lightNum: 28, // 彩灯数量
    runNum: 10, // 转盘至少转 n 圈
    prizeList: [], // 奖池
    animationData: {}, // 动画
    chance: 0, // 剩余抽奖机会
    btnDisabled: '', // 按钮是否可点
  },
  mounted: function() {
    this.getPrizeList();
    this.getChance();
  },
  methods: {
    /**
     * 获取奖品列表
     */
    getPrizeList: function() {
      this.prizeList = prizeListMock;
    },

    /**
     * 获取抽奖机会
     */
    getChance: function() {
      this.chance = 1;
    },

    /**
     * 点击抽奖
     */
    handleClickLottery: function() {
      var chance = this.chance;
      var btnDisabled = this.btnDisabled;
      if (btnDisabled) {
        return;
      }
      if (chance) {
        var prizeIndex = this.getPrizeIndex();
        this.handleTurnWheel(prizeIndex);
        this.btnDisabled = true;
        this.chance = chance - 1;
      } else {
        alert('没有机会了！')
      }
    },

    /**
     * 转动转盘
     */
    handleTurnWheel: function(prizeIndex) {
      var runNum = this.runNum;
      var prizeList = this.prizeList;
      var prizeLength = prizeList.length;
      var runDegs = this.runDegs || 0;
      this.runDegs = runDegs + (360 - runDegs % 360) + (360 * runNum - prizeIndex * (360 / prizeLength));

      this.animationData = {
        transform: 'rotate(' + this.runDegs + 'deg)',
        '-webkit-transform': 'rotate(' + this.runDegs + 'deg)'
      }
      this.btnDisabled = 'disabled';
      var that = this;
      setTimeout(function() {
        alert('您获得了' + prizeList[prizeIndex].name);
        that.btnDisabled = false;
      }, 5000);
    },

    /**
     * 获取中奖奖品 可以从后台获取，也可以前台自己算
     */
    getPrizeIndex: function() {
      // 生成随机数 0 - 1000
      var range = this.getPrizeProbabilityRange();
      var random = Math.random() * 1000;
      var prizeIndex = range.filter(function(item) {
        return random > item;
      }).length;
      console.log(random, range, prizeIndex);
      return prizeIndex;
    },

    /**
     * 生成奖品概率对应的区间范围 在1000的区间段。如果觉得不够 可适当调整精度。也跟奖品列表的 probability 的位数有关。
     */
    getPrizeProbabilityRange: function() {
      var prizeList = this.prizeList;
      var range = [];
      prizeList.reduce(function(prev, next) {
        var prevValue = '';
        if (prev.probability) {
          prevValue = prev.probability;
        } else if (prev.probability === 0) {
          prevValue = 0;
        } else {
          prevValue = prev;
        }
        range.push(parseInt(prevValue * 10, 10));
        return prevValue + next.probability;
      })
      return range;
    },

    handleShowResultModal: function() {
      this.isShowResultModal = true;
    },

    handleHideResultModal: function() {
      this.isShowResultModal = false;
    },
  },
});